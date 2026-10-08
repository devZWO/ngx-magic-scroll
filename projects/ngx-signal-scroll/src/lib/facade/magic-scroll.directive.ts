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
import { ActivatedRoute } from '@angular/router';
import { linkedRouteFragment } from '../navigation/linked-route-fragment';
import { injectScrollableParentElement } from '../navigation/inject-scrollable-parent';
import { NearestAnchorProvider } from '../navigation/nearest-anchor.provider';
import { ScrollOptions, ScrollService } from '../navigation/scroll-service';
import {
  MAGIC_SCROLL_OPTIONS,
  MagicScrollOptions,
  resolveMagicScrollOptions,
} from './magic-scroll-options';
import { NO_SCROLL_SOURCE, readScrollSource, ScrollSource } from './scroll-source';

/** Per-action overrides; the facade always chooses and scopes the scroll container. */
export type MagicScrollToOptions = Pick<
  ScrollOptions,
  'behavior' | 'topOffset' | 'ignoreWhenInView'
>;

/**
 * Anchor scrolling, URL sync, initial restoration and layout preservation in one directive.
 * Without scrollSource the initial rendered DOM is restored once (e.g. resolver data).
 * With a source, restoration waits for ready data and later updates preserve the current anchor.
 *
 * @example
 * <div magicScroll #scroll="magicScroll" [scrollSource]="projects">
 *   <section id="project-1">...</section>
 * </div>
 * <button (click)="scroll.scrollTo('project-1')">Project 1</button>
 */
@Directive({
  selector: '[magicScroll]',
  exportAs: 'magicScroll',
  providers: [NearestAnchorProvider],
  host: { '[attr.magicScroll]': '""' },
})
export class MagicScrollDirective {
  readonly scrollSource = input<ScrollSource | typeof NO_SCROLL_SOURCE, ScrollSource>(
    NO_SCROLL_SOURCE,
    { transform: (value) => value },
  );
  readonly scrollOptions = input<MagicScrollOptions>({});
  private readonly defaults = inject(MAGIC_SCROLL_OPTIONS);
  private readonly options = computed(() =>
    resolveMagicScrollOptions(this.defaults, this.scrollOptions()),
  );
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly service = inject(ScrollService);
  private readonly nearest = inject(NearestAnchorProvider);
  private readonly fragment = linkedRouteFragment();
  private readonly initialAnchor = inject(ActivatedRoute).snapshot.fragment;
  private readonly measuredHeaderHeight = signal(0);
  /** Current URL anchor, suitable for active-navigation highlighting. */
  readonly activeAnchor = this.fragment.asReadonly();
  /** Measured header height, useful for sticky companion panels. */
  readonly headerHeight = this.measuredHeaderHeight.asReadonly();
  /** Complete effective top offset, including header height and configured gap. */
  readonly offset = computed(() => this.headerHeight() + this.options().headerOffset);
  private readonly scrollRevision = signal(0);
  private initialized = false;
  private target?: EventTarget;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.refreshTarget();
      this.document.defaultView!.addEventListener('resize', this.onResize);
    });
    destroyRef.onDestroy(() => {
      this.target?.removeEventListener('scroll', this.onScroll);
      this.document.defaultView?.removeEventListener('resize', this.onResize);
      clearTimeout(this.timer);
    });

    // Registration order ensures header measurement precedes initial restoration.
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
    afterRenderEffect(() => {
      const source = this.scrollSource();
      const state = readScrollSource(source);
      if (!state.ready) return;
      untracked(() => {
        if (!this.initialized) {
          this.initialized = true;
          this.execute(this.initialAnchor, { behavior: this.options().behavior.restoration });
        } else if (source !== NO_SCROLL_SOURCE && this.options().restoreOnDataChange) {
          this.preserve('top');
        }
      });
    });
    effect(() => {
      if (!this.scrollRevision()) return;
      const anchor = this.nearest.getNearestAnchor({
        hostElement: this.host,
        anchors: this.anchors(),
        scrollable: this.scrollable(),
        headerOffset: this.offset(),
      });
      if (anchor) this.fragment.set(anchor);
    });
  }

  /** Explicit user navigation. Per-call options override region and provider defaults. */
  scrollTo(anchor: string, options: MagicScrollToOptions = {}): boolean {
    const executed = this.execute(anchor, {
      behavior: this.options().behavior.interaction,
      ignoreWhenInView: this.options().ignoreWhenInView,
      ...options,
    });
    if (executed) this.fragment.set(anchor.replace(/^#/, ''));
    return executed;
  }

  private anchors(): HTMLElement[] {
    const prefix = this.options().anchorPrefix;
    return Array.from(this.host.querySelectorAll<HTMLElement>('[id]')).filter(
      (el) =>
        !!el.id &&
        (el.hasAttribute('data-scroll-anchor') || el.id.startsWith(prefix)) &&
        el.closest('[magicScroll]') === this.host,
    );
  }

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

  private execute(anchor: string | null | undefined, options: MagicScrollToOptions): boolean {
    if (!anchor || !this.anchors().some((el) => el.id === anchor.replace(/^#/, ''))) return false;
    return this.service.scroll(anchor, {
      scrollable: this.scrollable(),
      topOffset: this.offset(),
      ...options,
    });
  }

  private preserve(ignoreWhenInView: ScrollOptions['ignoreWhenInView'] = 'none'): void {
    if (this.initialized) this.execute(this.fragment(), { behavior: 'instant', ignoreWhenInView });
  }

  private refreshTarget(): void {
    const target = this.scrollable() ?? this.document;
    if (target !== this.target) {
      this.target?.removeEventListener('scroll', this.onScroll);
      this.target = target;
      target.addEventListener('scroll', this.onScroll);
    }
  }

  private readonly onScroll = () => {
    if (!this.initialized) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => this.scrollRevision.update((revision) => revision + 1),
      this.options().debounceTime,
    );
  };

  private readonly onResize = () => {
    this.refreshTarget();
    if (this.options().preserveOnResize) this.preserve();
  };
}
