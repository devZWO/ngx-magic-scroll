import { inject, InjectionToken, Provider } from '@angular/core';
import { ScrollOptions } from '../navigation/scroll-service';

/**
 * Anchor selection strategy for a `magicScroll` region.
 * - `'all'`: Default strategy. Descendant elements matching any configured `anchorPrefixes`
 *   (or all non-empty IDs if no prefix is configured) as well as explicit `scrollAnchor` markers participate.
 * - `'explicit'`: Strict explicit-only mode. Only elements marked with `[scrollAnchor]` or `scrollAnchor`
 *   participate, regardless of their element ID or configured prefixes.
 */
export type AnchorSelectionMode = 'all' | 'explicit';

/** Defaults for an application or overrides for one `magicScroll` region. */
export interface MagicScrollOptions {
  /**
   * Allowed anchor ID prefixes. Descendant elements matching any prefix participate.
   * Explicit `scrollAnchor` markers also participate.
   * Passing an empty array `[]` disables prefix matching so only explicit markers participate.
   */
  anchorPrefixes?: readonly string[] | string[];
  /**
   * Selection strategy for anchor discovery.
   * - `'all'`: Selects elements matching prefixes or explicit markers (default).
   * - `'explicit'`: Selects only elements with explicit `scrollAnchor` markers.
   */
  anchorSelection?: AnchorSelectionMode;
  /** Selector for a fixed/sticky header whose height is measured automatically. */
  headerSelector?: string;
  /** Gap below the header, or the complete top offset when no header is selected. */
  headerOffset?: number;
  /** Bottom offset in pixels to adjust the active reading boundary from the bottom. */
  bottomOffset?: number;
  /** Relative activation threshold (0.0 to 1.0) defining the trigger line within the visible reading area. */
  activationThreshold?: number;
  /** Restoration and deliberate user navigation have separate defaults. */
  behavior?: {
    restoration?: ScrollBehavior;
    interaction?: ScrollBehavior;
  };
  debounceTime?: number;
  ignoreWhenInView?: ScrollOptions['ignoreWhenInView'];
  /** Keep the current anchor visible after later data updates. Defaults to true. */
  restoreOnDataChange?: boolean;
  /** Preserve the current anchor on window resize and measured header-height changes. */
  preserveOnResize?: boolean;
  /**
   * Preserve anchor-relative reading position when region content reflows
   * (e.g. image loads, form expansions, accordion toggles) without changing scrollSource.
   * Defaults to false (explicit opt-in).
   */
  preserveOnLayoutChange?: boolean;
}

export interface ResolvedMagicScrollOptions {
  anchorPrefixes: readonly string[];
  anchorSelection: AnchorSelectionMode;
  headerSelector: string;
  headerOffset: number;
  bottomOffset: number;
  activationThreshold: number;
  behavior: { restoration: ScrollBehavior; interaction: ScrollBehavior };
  debounceTime: number;
  ignoreWhenInView: NonNullable<ScrollOptions['ignoreWhenInView']>;
  restoreOnDataChange: boolean;
  preserveOnResize: boolean;
  preserveOnLayoutChange: boolean;
}

const defaults: ResolvedMagicScrollOptions = {
  anchorPrefixes: [''],
  anchorSelection: 'all',
  headerSelector: '',
  headerOffset: 0,
  bottomOffset: 0,
  activationThreshold: 0,
  behavior: { restoration: 'instant', interaction: 'smooth' },
  debounceTime: 500,
  ignoreWhenInView: 'none',
  restoreOnDataChange: true,
  preserveOnResize: true,
  preserveOnLayoutChange: false,
};

export function resolveMagicScrollOptions(
  parent: ResolvedMagicScrollOptions,
  options: MagicScrollOptions,
): ResolvedMagicScrollOptions {
  return {
    anchorPrefixes: options.anchorPrefixes ?? parent.anchorPrefixes,
    anchorSelection: options.anchorSelection ?? parent.anchorSelection,
    headerSelector: options.headerSelector ?? parent.headerSelector,
    headerOffset: options.headerOffset ?? parent.headerOffset,
    bottomOffset: options.bottomOffset ?? parent.bottomOffset,
    activationThreshold: options.activationThreshold ?? parent.activationThreshold,
    behavior: {
      restoration: options.behavior?.restoration ?? parent.behavior.restoration,
      interaction: options.behavior?.interaction ?? parent.behavior.interaction,
    },
    debounceTime: options.debounceTime ?? parent.debounceTime,
    ignoreWhenInView: options.ignoreWhenInView ?? parent.ignoreWhenInView,
    restoreOnDataChange: options.restoreOnDataChange ?? parent.restoreOnDataChange,
    preserveOnResize: options.preserveOnResize ?? parent.preserveOnResize,
    preserveOnLayoutChange: options.preserveOnLayoutChange ?? parent.preserveOnLayoutChange,
  };
}

export const MAGIC_SCROLL_OPTIONS = new InjectionToken<ResolvedMagicScrollOptions>(
  'Magic scroll defaults',
  { providedIn: 'root', factory: () => defaults },
);

/**
 * Register defaults globally or on a component. Child providers inherit unspecified options.
 * Per-region `scrollOptions` and per-call `scrollTo` options take precedence.
 *
 * @example
 * provideMagicScroll({ anchorPrefixes: ['project-'], behavior: { interaction: 'smooth' } })
 */
export function provideMagicScroll(options: MagicScrollOptions = {}): Provider {
  return {
    provide: MAGIC_SCROLL_OPTIONS,
    useFactory: () =>
      resolveMagicScrollOptions(
        inject(MAGIC_SCROLL_OPTIONS, { skipSelf: true, optional: true }) ?? defaults,
        options,
      ),
  };
}
