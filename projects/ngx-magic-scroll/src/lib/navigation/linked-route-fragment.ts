import { DestroyRef, effect, inject, linkedSignal, untracked, WritableSignal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  Router,
  type Navigation,
} from '@angular/router';

/**
 * Key used to tag internal library-initiated scroll-spy navigation events.
 */
export const MAGIC_SCROLL_ORIGIN_KEY = '__ngx_magic_scroll_origin';

/**
 * Value identifying an internal scroll-spy navigation origin.
 */
export const MAGIC_SCROLL_ORIGIN_SCROLL_SPY = 'scroll-spy';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Returns whether a navigation was initiated by this library rather than the user. */
export function isLibraryNavigation(nav: Navigation | null | undefined): boolean {
  if (!nav) return false;

  const info = nav.extras?.info;
  const state = nav.extras?.state;
  return (
    (isRecord(info) && info[MAGIC_SCROLL_ORIGIN_KEY] === MAGIC_SCROLL_ORIGIN_SCROLL_SPY) ||
    (nav.trigger !== 'popstate' &&
      isRecord(state) &&
      state[MAGIC_SCROLL_ORIGIN_KEY] === MAGIC_SCROLL_ORIGIN_SCROLL_SPY)
  );
}

function pathKey(router: Router, url: string): string {
  const tree = router.parseUrl(url);
  tree.fragment = null;
  tree.queryParams = {};
  return router.serializeUrl(tree);
}

/**
 * Creates an Angular signal synchronized bidirectionally with the URL fragment (#fragment).
 *
 * Reads the current route fragment as a writable signal (WritableSignal).
 * - Reading reacts to URL fragment changes through ActivatedRoute.fragment.
 * - Writing, for example fragmentSignal.set('anchor-id'), asynchronously updates the URL
 *   through Router.navigateByUrl with replaceUrl: true and origin tagging. This preserves query parameters
 *   and avoids adding a history entry for each scroll update while distinguishing scroll-spy updates from
 *   external user navigations.
 *
 * @returns A WritableSignal<string | null | undefined> linked to the URL fragment.
 * @example
 * ```ts
 * @Component({ ... })
 * export class MyViewComponent {
 *   // Initialize the signal
 *   protected readonly routeFragment = linkedRouteFragment();
 *
 *   onAnchorReached(anchorId: string) {
 *     // Update the URL fragment without adding history entries (#anchorId)
 *     this.routeFragment.set(anchorId);
 *   }
 * }
 * ```
 */
export function linkedRouteFragment(): WritableSignal<string | null | undefined> {
  const route = inject(ActivatedRoute);
  const router = inject(Router);
  const destroyRef = inject(DestroyRef);
  const fragment = toSignal(route.fragment);

  const actualFragment = linkedSignal(() => fragment());
  const currentNavigation = router.currentNavigation;
  const events = router.events;
  const canProtectNavigation = typeof currentNavigation === 'function' && Boolean(events);
  let deferredPath: string | undefined;

  if (!canProtectNavigation) {
    console.warn(
      'ngx-magic-scroll: Router is missing currentNavigation() or events; protection against in-flight navigation is disabled.',
    );
  }

  if (canProtectNavigation) {
    events?.pipe(takeUntilDestroyed(destroyRef)).subscribe((event) => {
      if (deferredPath === undefined) return;

      if (event instanceof NavigationEnd) {
        // A query-only navigation keeps the same route, so its scroll position remains relevant.
        const samePath = pathKey(router, event.urlAfterRedirects) === deferredPath;
        deferredPath = undefined;
        if (samePath) publishDeferredWhenNeeded();
        return;
      }

      if (
        event instanceof NavigationCancel ||
        event instanceof NavigationError ||
        event instanceof NavigationSkipped
      ) {
        deferredPath = undefined;
        publishDeferredWhenNeeded();
      }
    });
  }

  function publish(value: string | null | undefined): void {
    const tree = router.createUrlTree([], {
      relativeTo: route,
      fragment: value ?? undefined,
      queryParamsHandling: 'preserve',
    });

    const state = typeof history === 'undefined' ? {} : history.state;
    router
      .navigateByUrl(tree, {
        replaceUrl: true,
        state: {
          ...state,
          [MAGIC_SCROLL_ORIGIN_KEY]: MAGIC_SCROLL_ORIGIN_SCROLL_SPY,
        },
        info: { [MAGIC_SCROLL_ORIGIN_KEY]: MAGIC_SCROLL_ORIGIN_SCROLL_SPY },
      })
      .catch((error: Error) => {
        console.log(`Cant set fragment ${value}`, error);
      });
  }

  function publishDeferredWhenNeeded(): void {
    // Let the Router finish the current event before starting a replacement fragment navigation.
    queueMicrotask(() => {
      if (!destroyRef.destroyed && actualFragment() !== fragment()) {
        publish(actualFragment());
      }
    });
  }

  effect(() => {
    const newFragment = actualFragment();
    const currentRouteFragment = fragment();
    if (currentRouteFragment !== newFragment) {
      const navigation =
        typeof currentNavigation === 'function' ? untracked(() => currentNavigation()) : null;
      if (canProtectNavigation && navigation && !isLibraryNavigation(navigation)) {
        // navigateByUrl would supersede this user navigation; retain only the route identity here.
        deferredPath = pathKey(router, router.url);
        return;
      }

      publish(newFragment);
    }
  });

  return actualFragment;
}
