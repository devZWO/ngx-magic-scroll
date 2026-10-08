import { inject, InjectionToken, Provider } from '@angular/core';
import { ScrollOptions } from '../navigation/scroll-service';

/** Defaults for an application or overrides for one `magicScroll` region. */
export interface MagicScrollOptions {
  /** All descendant IDs participate when empty. Explicit `scrollAnchor`s also participate. */
  anchorPrefix?: string;
  /** Selector for a fixed/sticky header whose height is measured automatically. */
  headerSelector?: string;
  /** Gap below the header, or the complete top offset when no header is selected. */
  headerOffset?: number;
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
}

export interface ResolvedMagicScrollOptions {
  anchorPrefix: string;
  headerSelector: string;
  headerOffset: number;
  behavior: { restoration: ScrollBehavior; interaction: ScrollBehavior };
  debounceTime: number;
  ignoreWhenInView: NonNullable<ScrollOptions['ignoreWhenInView']>;
  restoreOnDataChange: boolean;
  preserveOnResize: boolean;
}

const defaults: ResolvedMagicScrollOptions = {
  anchorPrefix: '',
  headerSelector: '',
  headerOffset: 0,
  behavior: { restoration: 'instant', interaction: 'smooth' },
  debounceTime: 500,
  ignoreWhenInView: 'none',
  restoreOnDataChange: true,
  preserveOnResize: true,
};

export function resolveMagicScrollOptions(
  parent: ResolvedMagicScrollOptions,
  options: MagicScrollOptions,
): ResolvedMagicScrollOptions {
  return {
    anchorPrefix: options.anchorPrefix ?? parent.anchorPrefix,
    headerSelector: options.headerSelector ?? parent.headerSelector,
    headerOffset: options.headerOffset ?? parent.headerOffset,
    behavior: {
      restoration: options.behavior?.restoration ?? parent.behavior.restoration,
      interaction: options.behavior?.interaction ?? parent.behavior.interaction,
    },
    debounceTime: options.debounceTime ?? parent.debounceTime,
    ignoreWhenInView: options.ignoreWhenInView ?? parent.ignoreWhenInView,
    restoreOnDataChange: options.restoreOnDataChange ?? parent.restoreOnDataChange,
    preserveOnResize: options.preserveOnResize ?? parent.preserveOnResize,
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
 * provideMagicScroll({ anchorPrefix: 'project-', behavior: { interaction: 'smooth' } })
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
