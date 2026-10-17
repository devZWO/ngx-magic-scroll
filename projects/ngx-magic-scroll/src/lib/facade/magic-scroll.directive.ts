import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Navigation, Router } from '@angular/router';
import {
  linkedRouteFragment,
  MAGIC_SCROLL_ORIGIN_KEY,
  MAGIC_SCROLL_ORIGIN_SCROLL_SPY,
} from '../navigation/linked-route-fragment';
import { injectScrollableParentElement } from '../navigation/inject-scrollable-parent';
import { NearestAnchorProvider } from '../navigation/nearest-anchor.provider';
import { ScrollOptions, ScrollService } from '../navigation/scroll-service';
import {
  MAGIC_SCROLL_OPTIONS,
  MagicScrollOptions,
  resolveMagicScrollOptions,
} from './magic-scroll-options';
import { NO_SCROLL_SOURCE, readScrollSource, ScrollSource } from './scroll-source';

/**
 * Per-action scroll options for programmatic navigation via {@link MagicScrollDirective.scrollTo}.
 * Top offsets and container scoping are resolved automatically by the directive facade.
 */
export type MagicScrollToOptions = Pick<
  ScrollOptions,
  'behavior' | 'topOffset' | 'ignoreWhenInView' | 'focus'
>;

/**
 * Standard keyboard navigation keys that manipulate viewport scroll position.
 * Used by {@link MagicScrollDirective} to detect manual user scroll intent and cancel
 * pending automatic initial restorations prior to asynchronous data loading readiness.
 */
const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
  'Spacebar',
  'Space',
]);

/**
 * Determines whether an element is naturally focusable by default or possesses an explicit tabindex.
 */
function isNaturallyFocusable(el: HTMLElement): boolean {
  if (el.hasAttribute('tabindex')) {
    return true;
  }
  const tag = el.tagName.toLowerCase();
  if (tag === 'button' || tag === 'select' || tag === 'textarea') {
    return !(el as HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement).disabled;
  }
  if (tag === 'input') {
    return (el as HTMLInputElement).type !== 'hidden' && !(el as HTMLInputElement).disabled;
  }
  if (tag === 'a' || tag === 'area') {
    return el.hasAttribute('href');
  }
  if (tag === 'iframe') {
    return true;
  }
  return false;
}

/**
 * Determines whether a keyboard event target is an interactive or editable text control.
 * Ensures typing and navigating within input fields, textareas, dropdowns, and contenteditable
 * areas do not mistakenly cancel pending initial scroll restoration.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true;
  const editableHost = target.closest('[contenteditable]');
  const editableValue = editableHost?.getAttribute('contenteditable')?.toLowerCase();
  return Boolean(
    (target as HTMLElement).isContentEditable ||
    target.closest('input, textarea, select') ||
    editableValue === '' ||
    editableValue === 'true' ||
    editableValue === 'plaintext-only',
  );
}

/**
 * Complete facade directive coordinating anchor scrolling, two-tier route synchronization,
 * user-intent cancellation, data readiness restoration, and layout/data position preservation.
 *
 * @remarks
 * ### Architectural Pillars:
 * 1. **Two-Tier Anchor State Model**:
 *    - `liveAnchor`: Immediate per-scroll evaluation representing the visible section currently in view.
 *      Used as the source of truth for immediate data and layout realignments.
 *    - `fragment` / `activeAnchor`: Debounced (default 500ms) URL router synchronization preventing browser
 *      history thrashing during continuous scrolling.
 * 2. **User Intent Detection & Cancellation**:
 *    - Captures manual user gestures (`wheel`, `touchstart`, `touchmove`, navigation `keydown`) occurring prior
 *      to asynchronous `scrollSource` readiness.
 *    - Invalidates pending delayed initial restorations so conscious user navigation is never overridden.
 *    - Safely excludes editable form controls (`<input>`, `<textarea>`, `contenteditable`).
 * 3. **Reactive Render Pipeline & Lifecycle Coordination**:
 *    - Sequenced `afterRenderEffect` execution blocks guarantee sticky header measurement and `ResizeObserver`
 *      monitoring are active before initial fragment restoration and data preservation execute.
 * 4. **Preservation & Realignment Engine**:
 *    - Automatic realignments (`preserve()`) on data updates and container/header resizes based on the live active section.
 * 5. **Container & Anchor Scoping**:
 *    - Automatic scroll container resolution (window vs scrollable element) and hierarchical anchor ownership isolation.
 *
 * @example
 * ```html
 * <div magicScroll #scroll="magicScroll" [scrollSource]="projects">
 *   <section id="project-1">...</section>
 *   <section id="project-2">...</section>
 * </div>
 * <button (click)="scroll.scrollTo('project-2')">Go to Project 2</button>
 * ```
 */
@Directive({
  selector: '[magicScroll]',
  exportAs: 'magicScroll',
  providers: [NearestAnchorProvider],
  host: { '[attr.magicScroll]': '""' },
})
export class MagicScrollDirective {
  /**
   * Asynchronous data source or signal determining scroll readiness.
   * - When omitted (`NO_SCROLL_SOURCE`), initial restoration executes on the initial rendered DOM.
   * - When provided, initial restoration waits until `readScrollSource(source).ready === true`.
   *   Subsequent ready data updates trigger automatic position preservation when `restoreOnDataChange` is enabled.
   */
  readonly scrollSource = input<ScrollSource | typeof NO_SCROLL_SOURCE, ScrollSource>(
    NO_SCROLL_SOURCE,
    { transform: (value) => value },
  );

  /** Configuration overrides merged with global `provideMagicScroll` options. */
  readonly scrollOptions = input<MagicScrollOptions>({});

  private readonly defaults = inject(MAGIC_SCROLL_OPTIONS);
  private readonly options = computed(() =>
    resolveMagicScrollOptions(this.defaults, this.scrollOptions()),
  );
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly service = inject(ScrollService);
  private readonly nearest = inject(NearestAnchorProvider);
  private readonly router = inject(Router, { optional: true });

  /** Bidirectional route fragment synchronization signal (debounced URL writer and listener). */
  private readonly fragment = linkedRouteFragment();

  /** Initial route URL fragment snapshot captured upon directive instantiation. */
  private readonly initialAnchor = inject(ActivatedRoute).snapshot.fragment;

  /** Dynamically measured header height via ResizeObserver. */
  private readonly measuredHeaderHeight = signal(0);

  /**
   * Real-time visible section identifier updated per scroll event.
   * Serves as the source of truth for immediate data and layout realignments (`preserve`),
   * decoupling preservation from the debounced URL fragment signal.
   */
  private readonly liveAnchor = signal<string | null | undefined>(null);

  /** Current URL anchor, suitable for active-navigation highlighting. */
  readonly activeAnchor = this.fragment.asReadonly();

  /** Measured header height, useful for sticky companion panels. */
  readonly headerHeight = this.measuredHeaderHeight.asReadonly();

  /** Complete effective top offset, including header height and configured gap. */
  readonly offset = computed(() => this.headerHeight() + this.options().headerOffset);

  /** Monotonically increasing revision counter triggering debounced URL fragment updates. */
  private readonly scrollRevision = signal(0);

  /** Flag indicating whether the initial restoration phase has been executed. */
  private initialized = false;

  /**
   * Flag indicating whether manual user interaction (wheel, touch, or navigation keys) occurred
   * before asynchronous data loading became ready. When true, delayed restoration is skipped.
   */
  private userInterrupted = false;

  /**
   * Region-local anchor-relative pixel displacement tracking the distance between
   * the active section's top boundary and the visible activation reading boundary.
   * Preserved during automatic reflows (data prepending, container/header resizing)
   * to keep the reader's view stable without jumping back to section headings.
   */
  private savedDisplacement = 0;

  /** Pending destination anchor awaiting data readiness or DOM rendering. */
  private pendingDestination: string | null = this.initialAnchor ?? null;

  /** Tracks the last fragment processed from route fragment synchronization. */
  private lastProcessedFragment: string | null | undefined = undefined;

  private target?: EventTarget;
  private timer?: ReturnType<typeof setTimeout>;
  /** Active DOM mutation observer used to retry pending scroll destinations once target anchor elements are inserted. */
  private retryObserver?: MutationObserver;
  /** Timeout timer bounding the lifetime of destination retries to prevent memory leaks from non-existent anchors. */
  private retryTimeoutTimer?: ReturnType<typeof setTimeout>;
  /** Handle for the active coalesced requestAnimationFrame layout correction. */
  private layoutCorrectionFrameId?: number;
  /** Cleanups for elements given temporary tabindex="-1" to restore DOM state on blur or directive destruction. */
  private readonly temporaryTabindexCleanups = new Set<() => void>();
  /** Target element pending focus transfer after smooth scroll completion. */
  private pendingFocusTarget?: HTMLElement;
  /** Active scrollend event handler waiting for smooth scroll completion. */
  private scrollEndHandler?: () => void;
  /** Active EventTarget on which scrollEndHandler was registered. */
  private scrollEndTarget?: EventTarget;
  /** Safety timeout preventing a missed scrollend event from retaining a pending focus request. */
  private focusTimeoutTimer?: ReturnType<typeof setTimeout>;
  /** Element focused when the pending focus transfer was initiated. */
  private focusInitiator?: Element | null;
  /** Flag indicating whether programmatic smooth scrolling animation is actively running. */
  private isSmoothNavigating = false;
  /** Flag indicating a deferred layout preservation request while smooth navigation was active. */
  private pendingLayoutPreservation = false;
  /** Active scrollend event handler for programmatic smooth navigation settlement. */
  private smoothNavEndHandler?: () => void;
  /** Event target on which smoothNavEndHandler was registered. */
  private smoothNavTarget?: EventTarget;
  /** Safety timeout timer preventing smooth navigation lock if scrollend does not fire. */
  private smoothNavTimeoutTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.refreshTarget();
      this.document.defaultView?.addEventListener('resize', this.onResize);
    });
    destroyRef.onDestroy(() => {
      this.detachListeners();
      this.document.defaultView?.removeEventListener('resize', this.onResize);
      clearTimeout(this.timer);
      this.cancelDestinationRetry();
      this.cancelScheduledFocus();
      this.cancelLayoutPreservation();
      this.cancelSmoothNavigation();
      for (const cleanup of this.temporaryTabindexCleanups) {
        cleanup();
      }
      this.temporaryTabindexCleanups.clear();
      this.pendingDestination = null;
    });

    // Phase 1: Header measurement & ResizeObserver tracking.
    // Sequenced first so accurate header dimensions and offsets are available before initial restoration.
    afterRenderEffect((onCleanup) => {
      const selector = this.options().headerSelector;
      const header = selector ? this.document.querySelector<HTMLElement>(selector) : null;
      const measure = () => {
        const height = header?.getBoundingClientRect().height ?? 0;
        if (height !== this.headerHeight()) {
          this.measuredHeaderHeight.set(height);
          if (this.options().preserveOnResize) this.preserve();
        }
      };
      untracked(measure);
      if (header) {
        const observer = new ResizeObserver(measure);
        observer.observe(header);
        onCleanup(() => observer.disconnect());
      }
    });

    // Phase 1b: Region and anchor layout reflow observation & animation frame coalesced preservation.
    // Observes host dimensions and region-owned anchors when preserveOnLayoutChange is enabled,
    // coalescing rapid asynchronous layout changes (e.g. image loads, accordion expansions)
    // into a single preservation per frame.
    afterRenderEffect((onCleanup) => {
      this.scrollSource();
      if (
        this.options().preserveOnLayoutChange &&
        typeof ResizeObserver !== 'undefined' &&
        typeof window !== 'undefined'
      ) {
        const observedDimensions = new Map<Element, { width: number; height: number }>();
        const measureAndStore = (el: Element) => {
          const rect = el.getBoundingClientRect();
          const dims = { width: rect.width, height: rect.height };
          observedDimensions.set(el, dims);
          return dims;
        };

        const observer = new ResizeObserver((entries?: ResizeObserverEntry[]) => {
          let hasRealChange = false;
          if (!entries || !Array.isArray(entries) || entries.length === 0) {
            hasRealChange = true;
          } else {
            for (const entry of entries) {
              const target = entry.target;
              const prev = observedDimensions.get(target);
              const rect = (target as HTMLElement).getBoundingClientRect?.();
              const width = entry.contentRect?.width ?? rect?.width ?? 0;
              const height = entry.contentRect?.height ?? rect?.height ?? 0;
              if (!prev) {
                observedDimensions.set(target, { width, height });
              } else if (prev.width !== width || prev.height !== height) {
                observedDimensions.set(target, { width, height });
                hasRealChange = true;
              }
            }
          }
          if (hasRealChange) {
            this.scheduleLayoutPreservation();
          }
        });

        measureAndStore(this.host);
        observer.observe(this.host);
        for (const anchor of this.anchors()) {
          measureAndStore(anchor);
          observer.observe(anchor);
        }

        onCleanup(() => {
          observer.disconnect();
          observedDimensions.clear();
          this.cancelLayoutPreservation();
        });
      }
    });

    // Phase 2: Asynchronous scrollSource readiness, initial restoration, and data-change preservation.
    // Untracked execution guarantees execution triggers strictly on scrollSource readiness transitions.
    //
    // Note for developers: When scrollSource resolves (e.g. data loaded), target DOM elements may not
    // yet be rendered into the DOM (e.g. inside @for loops or child components).
    // Rather than discarding pendingDestination when execute() returns false (element not found),
    // we retain pendingDestination and schedule a bounded DOM MutationObserver retry to execute
    // immediately once child elements/anchor attributes are attached to the host DOM.
    afterRenderEffect(() => {
      const source = this.scrollSource();
      const state = readScrollSource(source);
      if (!state.ready) return;
      untracked(() => {
        if (!this.initialized) {
          this.initialized = true;
          if (!this.userInterrupted) {
            if (!this.tryExecutePendingDestination(this.options().behavior.restoration)) {
              if (this.pendingDestination) this.scheduleDestinationRetry();
            }
          } else {
            const nearest = this.calculateNearestAnchor() ?? null;
            this.liveAnchor.set(nearest);
            if (nearest) this.updateSavedDisplacement(nearest);
            this.cancelDestinationRetry();
          }
        } else {
          if (this.pendingDestination && !this.userInterrupted) {
            if (!this.tryExecutePendingDestination(this.options().behavior.restoration)) {
              this.scheduleDestinationRetry();
            }
          } else if (source !== NO_SCROLL_SOURCE && this.options().restoreOnDataChange) {
            this.preserve();
          }
        }
      });
    });

    // Phase 3: Route fragment synchronization to liveAnchor and external navigation handling.
    // When the route fragment changes externally (e.g., router navigation), synchronize liveAnchor
    // and trigger scroll restoration to the target element. If the target DOM element is not yet attached,
    // pendingDestination is preserved and scheduled for retry via MutationObserver.
    effect(() => {
      const frag = this.fragment();
      untracked(() => {
        const prev = this.lastProcessedFragment;
        this.lastProcessedFragment = frag;
        this.liveAnchor.set(frag);

        if (prev === undefined) {
          return;
        }

        if (frag) {
          if (!this.isInternalNavigation()) {
            this.cancelScheduledFocus();
            this.cancelLayoutPreservation();
            this.cancelSmoothNavigation();
            this.pendingLayoutPreservation = false;
            this.userInterrupted = false;
            this.savedDisplacement = 0;
            this.pendingDestination = frag;
            const source = this.scrollSource();
            const state = readScrollSource(source);
            if (this.initialized && state.ready) {
              if (!this.tryExecutePendingDestination(this.options().behavior.restoration)) {
                this.scheduleDestinationRetry();
              }
            } else {
              this.cancelDestinationRetry();
            }
          }
        } else {
          this.cancelScheduledFocus();
          this.cancelLayoutPreservation();
          this.cancelSmoothNavigation();
          this.pendingLayoutPreservation = false;
          this.savedDisplacement = 0;
          this.pendingDestination = null;
          this.cancelDestinationRetry();
        }
      });
    });

    // Phase 4: Scroll revision debounced publication to URL fragment.
    // Re-evaluates nearest anchor and commits it to the URL router after debounce delay.
    effect(() => {
      if (!this.scrollRevision()) return;
      const anchor = this.calculateNearestAnchor();
      if (anchor) {
        this.fragment.set(anchor);
      }
    });
  }

  /**
   * Determines whether the active router navigation was initiated internally by scroll-spy.
   */
  private isInternalNavigation(): boolean {
    const raw =
      typeof this.router?.getCurrentNavigation === 'function'
        ? (this.router.getCurrentNavigation() ?? this.router.lastSuccessfulNavigation)
        : this.router?.lastSuccessfulNavigation;
    const nav: Navigation | null =
      typeof raw === 'function' ? (raw as () => Navigation | null)() : (raw ?? null);
    const stateOrigin = (nav?.extras?.state as Record<string, unknown> | undefined)?.[
      MAGIC_SCROLL_ORIGIN_KEY
    ];
    const infoOrigin = (nav?.extras?.info as Record<string, unknown> | undefined)?.[
      MAGIC_SCROLL_ORIGIN_KEY
    ];
    return (
      infoOrigin === MAGIC_SCROLL_ORIGIN_SCROLL_SPY ||
      (nav?.trigger !== 'popstate' && stateOrigin === MAGIC_SCROLL_ORIGIN_SCROLL_SPY)
    );
  }

  /**
   * Explicitly scrolls the viewport to the target anchor identifier.
   *
   * @param anchor - Target anchor ID (with or without leading `#`).
   * @param options - Per-call scroll overrides (behavior, top offset, ignoreWhenInView, focus).
   * @returns `true` if the target anchor was found and scrolling initiated; `false` otherwise.
   *
   * @remarks
   * Successful execution immediately synchronizes both `liveAnchor` and the router `fragment`
   * with the target anchor, overriding any in-flight debounce delays.
   *
   * When `options.focus` is true, DOM focus is transferred to the resolved anchor element using
   * `preventScroll: true` without triggering secondary browser scrolling. For non-focusable containers,
   * a temporary `tabindex="-1"` is applied and removed upon blur or directive destruction.
   */
  scrollTo(anchor: string, options: MagicScrollToOptions = {}): boolean {
    this.refreshTarget();
    this.cancelScheduledFocus();
    const clean = anchor.replace(/^#/, '');
    const targetEl = this.anchors().find((el) => el.id === clean);
    const willScroll = targetEl ? this.willScroll(targetEl, options) : false;
    const behavior = options.behavior ?? this.options().behavior.interaction;
    const isSmooth = willScroll && this.hasSmoothScrollBehavior(behavior);
    if (isSmooth) {
      this.beginSmoothNavigation();
    } else {
      this.cancelSmoothNavigation();
    }
    const executed = this.execute(anchor, {
      behavior: this.options().behavior.interaction,
      ignoreWhenInView: this.options().ignoreWhenInView,
      ...options,
      displacement: 0,
    });
    if (executed) {
      this.liveAnchor.set(clean);
      this.savedDisplacement = 0;
      this.pendingDestination = null;
      this.cancelDestinationRetry();
      this.cancelLayoutPreservation();
      this.fragment.set(clean);
    }
    if (options.focus && targetEl) {
      if (executed && willScroll && this.hasSmoothScrollBehavior(behavior)) {
        this.scheduleFocus(targetEl);
      } else {
        this.applyFocus(targetEl);
      }
    }
    return executed;
  }

  /**
   * Attempts to execute navigation to the pending destination anchor.
   *
   * @param behavior - The scroll animation behavior to apply (`instant` or `smooth`).
   * @returns `true` if the target anchor element was found in the DOM and scrolling was initiated; `false` otherwise.
   *
   * @remarks
   * If execution succeeds, `pendingDestination` is cleared and active retry observers/timers are canceled.
   * If target elements are not yet present in the DOM (e.g. data is ready before DOM elements render),
   * `pendingDestination` remains queued so subsequent DOM updates can retry.
   */
  private tryExecutePendingDestination(behavior: ScrollBehavior): boolean {
    if (!this.pendingDestination) return false;
    const clean = this.pendingDestination.replace(/^#/, '');
    const targetEl = this.anchors().find((el) => el.id === clean);
    const willScroll = targetEl ? this.willScroll(targetEl, { behavior }) : false;
    const isSmooth = willScroll && this.hasSmoothScrollBehavior(behavior);
    if (isSmooth) {
      this.beginSmoothNavigation();
    }
    if (this.execute(this.pendingDestination, { behavior, displacement: 0 })) {
      this.savedDisplacement = 0;
      this.pendingDestination = null;
      this.cancelDestinationRetry();
      return true;
    }
    return false;
  }

  /**
   * Schedules a bounded retry mechanism observing DOM additions and attribute modifications
   * within the directive host to re-attempt scrolling when the target anchor element is rendered.
   *
   * @remarks
   * Asynchronous rendering cycles (such as Angular `@for` loops, `@if` blocks, or asynchronous child components)
   * often resolve data/signals (`scrollSource`) before child DOM anchor nodes are attached to the document.
   *
   * To prevent dropped navigations without polling or manual timeouts, a `MutationObserver` watches host mutations
   * for child node insertions and anchor attribute modifications (`id`, `data-scroll-anchor`). When DOM mutations
   * occur and the scroll source is ready, destination execution is re-attempted.
   *
   * A bounded 1000ms safety timeout safeguards against indefinite observation if a non-existent anchor ID was requested.
   */
  private scheduleDestinationRetry(): void {
    if (!this.retryObserver) {
      this.retryObserver = new MutationObserver(() => {
        const state = readScrollSource(this.scrollSource());
        if (state.ready) {
          this.tryExecutePendingDestination(this.options().behavior.restoration);
        }
      });
      this.retryObserver.observe(this.host, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['id', 'data-scroll-anchor'],
      });
    }
    clearTimeout(this.retryTimeoutTimer);
    this.retryTimeoutTimer = setTimeout(() => this.cancelDestinationRetry(), 1000);
  }

  /**
   * Disconnects the DOM mutation observer and clears active retry timers.
   *
   * @remarks
   * Invoked whenever destination execution succeeds, a user interrupts navigation (via scroll, touch, or keyboard),
   * an explicit navigation supersedes the pending target, or the directive is destroyed.
   */
  private cancelDestinationRetry(): void {
    if (this.retryObserver) {
      this.retryObserver.disconnect();
      this.retryObserver = undefined;
    }
    clearTimeout(this.retryTimeoutTimer);
    this.retryTimeoutTimer = undefined;
  }

  /**
   * Queries and returns all eligible scroll anchor elements belonging strictly to this directive instance.
   *
   * @remarks
   * Anchors must possess a non-empty `id` and satisfy the configured selection strategy:
   * - In `'explicit'` mode: Only elements marked with the `data-scroll-anchor` attribute participate,
   *   ignoring prefix rules and excluding generated component/form IDs.
   * - In `'all'` mode (default): Elements matching any configured `anchorPrefixes` OR bearing
   *   the `data-scroll-anchor` attribute participate.
   *
   * The `closest('[magicScroll]') === this.host` check guarantees that nested child regions
   * retain strict isolation over their own anchors and do not leak across region boundaries.
   */
  private anchors(): HTMLElement[] {
    const { anchorSelection, anchorPrefixes } = this.options();
    return Array.from(this.host.querySelectorAll<HTMLElement>('[id]')).filter((el) => {
      // 1. Elements must have a non-empty ID and belong directly to this magicScroll host.
      if (!el.id || el.closest('[magicScroll]') !== this.host) {
        return false;
      }

      // 2. Strict explicit selection strategy: Ignore prefixes; admit only explicitly marked elements.
      if (anchorSelection === 'explicit') {
        return el.hasAttribute('data-scroll-anchor');
      }

      // 3. Default/all selection strategy: Admit explicitly marked elements or elements matching any configured prefix.
      return (
        el.hasAttribute('data-scroll-anchor') ||
        anchorPrefixes.some((prefix) => el.id.startsWith(prefix))
      );
    });
  }

  /**
   * Resolves the active scroll container element governing viewport offsets.
   *
   * @returns The scrollable container `HTMLElement`, or `undefined` when scrolling against the document root / window.
   */
  private scrollable(): HTMLElement | undefined {
    const overflow = getComputedStyle(this.host).overflowY;
    const container =
      overflow === 'auto' || overflow === 'scroll'
        ? this.host
        : injectScrollableParentElement(this.host);
    // Root scrolling emits events on document, even when overflow is set on body/html.
    return container === this.document.documentElement || container === this.document.body
      ? undefined
      : container;
  }

  /**
   * Computes the nearest visible anchor according to current viewport geometry, header offsets,
   * bottom offsets, and reading direction thresholds.
   */
  private calculateNearestAnchor(): string | undefined {
    return this.nearest.getNearestAnchor({
      hostElement: this.host,
      anchors: this.anchors(),
      scrollable: this.scrollable(),
      headerOffset: this.offset(),
      bottomOffset: this.options().bottomOffset,
      activationThreshold: this.options().activationThreshold,
    });
  }

  /**
   * Dispatches scrolling to the underlying {@link ScrollService} after validating target presence.
   */
  private execute(anchor: string | null | undefined, options: ScrollOptions): boolean {
    if (!anchor || !this.anchors().some((el) => el.id === anchor.replace(/^#/, ''))) return false;
    return this.service.scroll(anchor, {
      scrollable: this.scrollable(),
      topOffset: this.offset(),
      ...options,
    });
  }

  /**
   * Determines whether the requested navigation will change the scroll position after clamping.
   */
  private willScroll(targetEl: HTMLElement, options: MagicScrollToOptions): boolean {
    const scrollable =
      this.scrollable() ??
      (this.document.scrollingElement as HTMLElement | null) ??
      this.document.documentElement;
    const isDocument =
      scrollable === this.document.documentElement || scrollable === this.document.body;
    const containerTop = isDocument ? 0 : scrollable.getBoundingClientRect().top;
    const viewportHeight = isDocument
      ? this.document.documentElement.clientHeight
      : scrollable.clientHeight;
    const topOffset = options.topOffset ?? this.offset();
    const delta = targetEl.getBoundingClientRect().top - containerTop - topOffset;
    const maxScrollTop =
      scrollable.scrollHeight > 0 && viewportHeight > 0
        ? Math.max(0, scrollable.scrollHeight - viewportHeight)
        : Infinity;
    const targetScrollTop = Math.min(Math.max(scrollable.scrollTop + delta, 0), maxScrollTop);
    return Math.abs(targetScrollTop - scrollable.scrollTop) >= 1;
  }

  /**
   * Resolves whether the browser will animate this request, including `auto` with smooth CSS behavior.
   */
  private hasSmoothScrollBehavior(behavior: ScrollBehavior): boolean {
    if (behavior === 'smooth') return true;
    if (behavior !== 'auto') return false;
    const scrollable = this.scrollable() ?? this.document.documentElement;
    return this.document.defaultView?.getComputedStyle(scrollable).scrollBehavior === 'smooth';
  }

  /**
   * Realigns the viewport instantly to preserve anchor-relative reading position
   * during asynchronous data updates, container resizes, or header dimension changes.
   *
   * @remarks
   * Targets `liveAnchor` (the real-time visible section) and restores `savedDisplacement`
   * (the pixel offset between the anchor's top and the container's top boundary).
   * If native browser scroll anchoring (`overflow-anchor`) has already adjusted scroll position,
   * delta computes to 0, inherently avoiding double-compensation.
   * If the active anchor element is no longer present in the DOM, realignment is skipped deterministically.
   */
  private preserve(): void {
    if (this.initialized) {
      if (this.isSmoothNavigating) {
        this.pendingLayoutPreservation = true;
        return;
      }
      const anchor = this.liveAnchor();
      if (!anchor) return;
      this.execute(anchor, {
        behavior: 'instant',
        displacement: this.savedDisplacement,
      });
    }
  }

  /**
   * Schedules a coalesced layout realignment via requestAnimationFrame.
   * Batches multiple synchronous or rapid descendant reflows into a single correction per frame.
   */
  private scheduleLayoutPreservation(): void {
    if (!this.initialized || typeof window === 'undefined') {
      return;
    }
    if (this.isSmoothNavigating) {
      this.pendingLayoutPreservation = true;
      return;
    }
    if (this.layoutCorrectionFrameId !== undefined) {
      return;
    }
    this.layoutCorrectionFrameId = window.requestAnimationFrame(() => {
      this.layoutCorrectionFrameId = undefined;
      this.preserve();
    });
  }

  /**
   * Cancels any pending requestAnimationFrame layout realignment.
   */
  private cancelLayoutPreservation(): void {
    if (this.layoutCorrectionFrameId !== undefined && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.layoutCorrectionFrameId);
      this.layoutCorrectionFrameId = undefined;
    }
  }

  /**
   * Captures and stores the pixel displacement between the active anchor's top edge
   * and the visible activation reading boundary (`containerTop + topOffset`).
   */
  private updateSavedDisplacement(anchorId: string): void {
    const clean = anchorId.replace(/^#/, '');
    const anchorEl = this.anchors().find((el) => el.id === clean);
    if (!anchorEl) return;
    const scrollable = this.scrollable();
    const isDocument =
      !scrollable ||
      scrollable === this.document.documentElement ||
      scrollable === this.document.body;
    const containerTop = isDocument ? 0 : scrollable.getBoundingClientRect().top;
    const topBoundary = containerTop + this.offset();
    this.savedDisplacement = anchorEl.getBoundingClientRect().top - topBoundary;
  }

  /**
   * Updates target container references and re-binds passive event listeners whenever
   * the scroll container shifts dynamically.
   */
  private refreshTarget(): void {
    const target = this.scrollable() ?? this.document;
    if (target !== this.target) {
      this.detachListeners();
      this.target = target;
      this.attachListeners(target);
    }
  }

  /**
   * Attaches passive scroll, gesture, and keyboard listeners to track user intent and scroll motion.
   */
  private attachListeners(target: EventTarget): void {
    target.addEventListener('scroll', this.onScroll);
    target.addEventListener('wheel', this.onUserIntent, { passive: true });
    target.addEventListener('touchstart', this.onUserIntent, { passive: true });
    target.addEventListener('touchmove', this.onUserIntent, { passive: true });
    target.addEventListener('keydown', this.onKeyDown);
    this.document.addEventListener('keydown', this.onKeyDown);
  }

  /**
   * Applies DOM focus safely to the target anchor element using `preventScroll: true`.
   * Automatically assigns a temporary `tabindex="-1"` to non-focusable landmark containers
   * and registers a one-time blur listener to cleanly remove it when focus shifts away.
   */
  private applyFocus(targetEl: HTMLElement): void {
    if (
      !this.document.defaultView ||
      typeof targetEl.focus !== 'function' ||
      !targetEl.isConnected ||
      !this.anchors().includes(targetEl)
    ) {
      return;
    }
    const addedTabindex = !isNaturallyFocusable(targetEl);
    let cleanup: (() => void) | undefined;
    if (addedTabindex) {
      targetEl.setAttribute('tabindex', '-1');
      const onBlur = () => cleanupFn();
      const cleanupFn = () => {
        targetEl.removeEventListener('blur', onBlur);
        if (targetEl.getAttribute('tabindex') === '-1') {
          targetEl.removeAttribute('tabindex');
        }
        this.temporaryTabindexCleanups.delete(cleanupFn);
      };
      cleanup = cleanupFn;
      this.temporaryTabindexCleanups.add(cleanupFn);
      targetEl.addEventListener('blur', onBlur, { once: true });
    }
    targetEl.focus({ preventScroll: true });
    if (this.document.activeElement !== targetEl && cleanup) {
      cleanup();
    }
  }

  /**
   * Schedules focus transfer to execute upon smooth scroll completion (`scrollend`).
   */
  private scheduleFocus(targetEl: HTMLElement): void {
    this.refreshTarget();
    this.cancelScheduledFocus();
    this.pendingFocusTarget = targetEl;
    this.focusInitiator = this.document.activeElement;
    this.document.addEventListener('focusin', this.onFocusIn);
    this.document.addEventListener('keydown', this.onFocusTransferKeyDown);
    this.document.addEventListener('pointerdown', this.onFocusTransferPointerDown, true);
    this.document.addEventListener('wheel', this.onFocusScrollIntent, { passive: true });
    this.document.addEventListener('touchstart', this.onFocusScrollIntent, { passive: true });
    this.document.addEventListener('touchmove', this.onFocusScrollIntent, { passive: true });
    const target = this.target!;
    this.scrollEndTarget = target;
    this.scrollEndHandler = () => {
      this.cancelScheduledFocus();
      this.applyFocus(targetEl);
    };
    target.addEventListener('scrollend', this.scrollEndHandler, { once: true });
    this.focusTimeoutTimer = setTimeout(() => this.cancelScheduledFocus(), 5000);
  }

  /**
   * Cancels any pending scheduled focus transfer and unregisters the `scrollend` listener.
   */
  private cancelScheduledFocus(): void {
    if (this.scrollEndHandler && this.scrollEndTarget) {
      this.scrollEndTarget.removeEventListener('scrollend', this.scrollEndHandler);
      this.scrollEndHandler = undefined;
      this.scrollEndTarget = undefined;
    }
    clearTimeout(this.focusTimeoutTimer);
    this.focusTimeoutTimer = undefined;
    this.document.removeEventListener('focusin', this.onFocusIn);
    this.document.removeEventListener('keydown', this.onFocusTransferKeyDown);
    this.document.removeEventListener('pointerdown', this.onFocusTransferPointerDown, true);
    this.document.removeEventListener('wheel', this.onFocusScrollIntent);
    this.document.removeEventListener('touchstart', this.onFocusScrollIntent);
    this.document.removeEventListener('touchmove', this.onFocusScrollIntent);
    this.focusInitiator = undefined;
    this.pendingFocusTarget = undefined;
  }

  /**
   * Detaches all registered event listeners to ensure clean teardown without memory leaks.
   */
  private detachListeners(): void {
    if (!this.target) return;
    this.cancelScheduledFocus();
    this.cancelSmoothNavigation();
    this.target.removeEventListener('scroll', this.onScroll);
    this.target.removeEventListener('wheel', this.onUserIntent);
    this.target.removeEventListener('touchstart', this.onUserIntent);
    this.target.removeEventListener('touchmove', this.onUserIntent);
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.document.removeEventListener('keydown', this.onKeyDown);
  }

  /**
   * Intercepts manual user gestures (`wheel`, `touchstart`, `touchmove`) to flag user interaction
   * and cancel delayed restorations prior to data readiness.
   */
  private readonly onUserIntent = () => {
    this.userInterrupted = true;
    this.pendingDestination = null;
    this.cancelDestinationRetry();
    this.cancelScheduledFocus();
    this.cancelLayoutPreservation();
    this.cancelSmoothNavigation();
    this.pendingLayoutPreservation = false;
  };

  /**
   * Intercepts navigation keyboard events (`ArrowUp`, `ArrowDown`, `PageUp`, `PageDown`, `Home`, `End`, `Space`).
   * Cancels pending restoration when navigation occurs within the relevant scroll context
   * while safely ignoring interactions on editable input elements.
   */
  private readonly onKeyDown = (event: Event) => {
    if (!(event instanceof KeyboardEvent)) return;
    if (isEditableTarget(event.target)) return;
    if (!SCROLL_KEYS.has(event.key)) return;
    const targetEl = event.target as Element | null;
    const scrollable = this.scrollable();
    const isInsideContext =
      !targetEl ||
      targetEl === this.document.body ||
      targetEl === this.document.documentElement ||
      (scrollable ? scrollable === targetEl || scrollable.contains(targetEl) : true);
    if (isInsideContext) {
      this.userInterrupted = true;
      this.pendingDestination = null;
      this.cancelDestinationRetry();
      this.cancelScheduledFocus();
      this.cancelLayoutPreservation();
      this.cancelSmoothNavigation();
      this.pendingLayoutPreservation = false;
    }
  };

  private readonly onFocusScrollIntent = () => {
    this.cancelScheduledFocus();
  };

  private readonly onFocusIn = (event: Event) => {
    if (this.pendingFocusTarget && event.target !== this.focusInitiator) {
      this.cancelScheduledFocus();
    }
  };

  private readonly onFocusTransferKeyDown = (event: Event) => {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.key === 'Tab') {
      this.cancelScheduledFocus();
      return;
    }
    if (isEditableTarget(event.target)) return;
    if (SCROLL_KEYS.has(event.key)) {
      this.cancelScheduledFocus();
    }
  };

  private readonly onFocusTransferPointerDown = (event: Event) => {
    const target = event.target;
    if (
      this.pendingFocusTarget &&
      target instanceof Node &&
      target !== this.focusInitiator &&
      !this.focusInitiator?.contains(target)
    ) {
      this.cancelScheduledFocus();
    }
  };

  /**
   * Handles scroll events by immediately updating `liveAnchor` for position preservation,
   * while debouncing `scrollRevision` increments to update the browser URL fragment without thrashing history.
   */
  private readonly onScroll = () => {
    if (!this.initialized) return;
    if (!this.isSmoothNavigating) {
      const anchor = this.calculateNearestAnchor();
      if (anchor) {
        this.liveAnchor.set(anchor);
        this.updateSavedDisplacement(anchor);
      }
    }
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => this.scrollRevision.update((revision) => revision + 1),
      this.options().debounceTime,
    );
  };

  /**
   * Handles window resize events by re-evaluating targets and optionally realigning the active anchor.
   */
  private readonly onResize = () => {
    this.refreshTarget();
    if (this.options().preserveOnResize) this.preserve();
  };

  /**
   * Initiates smooth programmatic navigation protection, deferring layout realignments
   * and intermediate anchor snapping until scrolling completes (`scrollend`) or times out.
   */
  private beginSmoothNavigation(): void {
    this.cancelSmoothNavigation();
    this.isSmoothNavigating = true;
    this.refreshTarget();
    const target = this.target!;
    this.smoothNavTarget = target;
    this.smoothNavEndHandler = () => {
      this.endSmoothNavigation();
    };
    target.addEventListener('scrollend', this.smoothNavEndHandler, { once: true });
    this.smoothNavTimeoutTimer = setTimeout(() => {
      this.endSmoothNavigation();
    }, 3000);
  }

  /**
   * Concludes smooth programmatic navigation, updating the reading position
   * at the settled destination and processing any deferred layout preservation requests.
   */
  private endSmoothNavigation(): void {
    this.cancelSmoothNavigation();
    const anchor = this.calculateNearestAnchor();
    if (anchor) {
      this.liveAnchor.set(anchor);
      this.updateSavedDisplacement(anchor);
    }
    if (this.pendingLayoutPreservation) {
      this.pendingLayoutPreservation = false;
      this.scheduleLayoutPreservation();
    }
  }

  /**
   * Cancels active smooth navigation tracking and clears timeout timers and scrollend listeners.
   */
  private cancelSmoothNavigation(): void {
    if (this.smoothNavEndHandler && this.smoothNavTarget) {
      this.smoothNavTarget.removeEventListener('scrollend', this.smoothNavEndHandler);
      this.smoothNavEndHandler = undefined;
      this.smoothNavTarget = undefined;
    }
    clearTimeout(this.smoothNavTimeoutTimer);
    this.smoothNavTimeoutTimer = undefined;
    this.isSmoothNavigating = false;
  }
}
