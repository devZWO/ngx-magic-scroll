import { effect, inject, linkedSignal, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * Key used to tag internal library-initiated scroll-spy navigation events.
 */
export const MAGIC_SCROLL_ORIGIN_KEY = '__ngx_magic_scroll_origin';

/**
 * Value identifying an internal scroll-spy navigation origin.
 */
export const MAGIC_SCROLL_ORIGIN_SCROLL_SPY = 'scroll-spy';

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
  const fragment = toSignal(route.fragment);

  const actualFragment = linkedSignal(() => fragment());

  effect(() => {
    const newFragment = actualFragment();
    const currentRouteFragment = fragment();
    if (currentRouteFragment !== newFragment) {
      const tree = router.createUrlTree([], {
        relativeTo: route,
        fragment: newFragment ?? undefined,
        queryParamsHandling: 'preserve',
      });

      router
        .navigateByUrl(tree, {
          replaceUrl: true,
          state: { [MAGIC_SCROLL_ORIGIN_KEY]: MAGIC_SCROLL_ORIGIN_SCROLL_SPY },
          info: { [MAGIC_SCROLL_ORIGIN_KEY]: MAGIC_SCROLL_ORIGIN_SCROLL_SPY },
        })
        .catch((error: Error) => {
          console.log(`Cant set fragment ${newFragment}`, error);
        });
    }
  });

  return actualFragment;
}
