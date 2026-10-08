import { effect, inject, linkedSignal, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * Erstellt ein bidirektional synchronisiertes Angular-Signal für das URL-Fragment (`#fragment`).
 *
 * Diese Hilfsfunktion ermöglicht es, das aktuelle Route-Fragment als beschreibbares Signal (`WritableSignal`)
 * zu lesen und zu manipulieren:
 * - **Lesend:** Reagiert reaktiv auf Änderungen des URL-Fragments über `ActivatedRoute.fragment`.
 * - **Schreibend:** Setzen eines neuen Werts (`fragmentSignal.set('anchor-id')`) aktualisiert die URL
 *   asynchron via `Router.navigateByUrl`, wobei `replaceUrl: true` gesetzt wird (um den Browserverlauf nicht
 *   mit Scroll-Zuständen zu überfluten) und bestehende Query-Parameter erhalten bleiben.
 *
 * @returns Ein `WritableSignal<string | null | undefined>`, das an das URL-Fragment gekoppelt ist.
 *
 * @example
 * ```ts
 * @Component({ ... })
 * export class MyViewComponent {
 *   // Signal initialisieren
 *   protected readonly routeFragment = linkedRouteFragment();
 *
 *   onAnchorReached(anchorId: string) {
 *     // URL-Fragment lautlos aktualisieren (#anchorId)
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
    if (route.snapshot.fragment !== newFragment) {
      const tree = router.createUrlTree([], {
        relativeTo: route,
        fragment: newFragment ?? undefined,
        queryParamsHandling: 'preserve',
      });

      router.navigateByUrl(tree, { replaceUrl: true }).catch((error: Error) => {
        console.log(`Cant set fragment ${newFragment}`, error);
      });
    }
  });

  return actualFragment;
}
