import { Directive, ElementRef, inject, Injector, input, OnInit } from '@angular/core';
import { injectRouteFragment } from 'ngxtension/inject-route-fragment';
import { effectOnceIf } from 'ngxtension/effect-once-if';
import { CreateInfiniteQueryResult } from '@tanstack/angular-query-experimental';
import { ScrollService } from './scroll-service';
import { injectScrollableParentElement } from './inject-scrollable-parent';

/**
 * Direktive für das einmalige initiale Scrollen zu einem in der URL angegebenen Anker (#fragment),
 * sobald asynchrone Daten (z. B. via TanStack Query) zum ersten Mal erfolgreich geladen wurden.
 *
 * Löst das Problem, dass beim Seitenaufruf mit einem Fragment in der URL das Zielelement
 * noch gar nicht im DOM existiert, weil die Daten erst asynchron per API geladen werden.
 * Sobald `queryResult.data()` vorhanden und `isLoading()` `false` ist, wird genau einmal
 * zum Anker gescrollt.
 *
 * @example
 * ```html
 * <div
 *   [appScrollingOnFirstData]="myInfiniteQuery"
 *   [onlyOnceScrollBehavior]="'instant'"
 *   [onlyOnceTopOffset]="20"
 * >
 *   <!-- Liste von asynchron geladenen Elementen -->
 * </div>
 * ```
 */
@Directive({
  selector: '[appScrollingOnFirstData]',
})
export class ScrollToFragmentOnFirstDataDirective implements OnInit {
  /*
    eslint-disable @angular-eslint/no-input-rename -- there are several directives with internally the same attribute
    that can be applied simultaneously, that's why we need different specific external names
   */
  /**
   * Das TanStack-Query-Ergebnis (z. B. `injectInfiniteQuery`), dessen Datenzustand überwacht wird.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- we do not care about the type of the query here
  public readonly queryResult = input.required<CreateInfiniteQueryResult<any>>({
    alias: 'appScrollingOnFirstData',
  });

  /**
   * Das gewünschte Scroll-Verhalten beim initialen Sprung ('instant', 'smooth', 'auto').
   * Standardmäßig `'instant'`.
   */
  public readonly scroll = input<'instant' | 'smooth' | 'auto'>('instant', {
    alias: 'onlyOnceScrollBehavior',
  });

  /**
   * Zusätzlicher oberer Abstand in Pixeln zum Zielanker.
   */
  public readonly topOffset = input(0, { alias: 'onlyOnceTopOffset' });
  /* eslint-enable @angular-eslint/no-input-rename */

  // we do resolve the anchor immediately, for we are not interested in later changes
  // and only want to scroll once after page loading
  private readonly anchor = injectRouteFragment()() ?? '';
  private readonly injector = inject(Injector);
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly scrollService = inject(ScrollService);

  ngOnInit(): void {
    effectOnceIf(
      // the first time the data loading finished successfully, the scrolling starts
      () => !!this.anchor && !!this.queryResult().data() && !this.queryResult().isLoading(),
      // set timeout waits until next render tick to assure the anchor was rendered
      () => {
        setTimeout(() => {
          const scrollable = injectScrollableParentElement(
            this.hostElement.nativeElement as HTMLElement,
          );
          this.scrollService.scroll(this.anchor, {
            scrollable: scrollable,
            topOffset: this.topOffset(),
          });
        });
      },

      { injector: this.injector },
    );
  }
}
