import { Directive, ElementRef, inject, Injector, input, OnInit, untracked } from '@angular/core';
import { injectRouteFragment } from 'ngxtension/inject-route-fragment';
import { CreateInfiniteQueryResult } from '@tanstack/angular-query-experimental';
import { effectSkipFirstIf } from '../effects/effect-skip-first-if';
import { injectScrollableParentElement } from './inject-scrollable-parent';
import { ScrollService } from './scroll-service';

/**
 * Direktive für das erneute Scrollen zum URL-Anker bei nachfolgenden Datenänderungen.
 *
 * Im Gegensatz zu `ScrollToFragmentOnFirstDataDirective` ignoriert diese Direktive das erste Laden
 * (über `effectSkipFirstIf`) und reagiert erst, wenn sich die Daten im laufenden Betrieb ändern
 * (z. B. Nachladen weiterer Seiten, Refetching oder Filterwechsel), um den aktuellen Anker
 * im Sichtbereich zu halten, falls das Ziel durch DOM-Umbau verschoben wurde.
 *
 * @example
 * ```html
 * <div
 *   [appScrollingOnDataChange]="myInfiniteQuery"
 *   [skipFirstScrollBehavior]="'smooth'"
 *   [skipFirstTopOffset]="20"
 * >
 *   <!-- Dynamisch aktualisierte Datenliste -->
 * </div>
 * ```
 */
@Directive({
  selector: '[appScrollingOnDataChange]',
})
export class ScrollToFragmentOnDataChangeDirective implements OnInit {
  /*
    eslint-disable @angular-eslint/no-input-rename -- there are several directives with internally the same
    attribute that can be applied simultaneously, that's why we need different specific external names
  */
  /**
   * Das TanStack-Query-Ergebnis (z. B. `injectInfiniteQuery`), dessen Datenaktualisierungen überwacht werden.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- we do not care about the type of the query here
  public readonly queryResult = input.required<CreateInfiniteQueryResult<any>>({
    alias: 'appScrollingOnDataChange',
  });

  /**
   * Das gewünschte Scroll-Verhalten bei Datenänderungen ('instant', 'smooth', 'auto').
   * Standardmäßig `'smooth'`.
   */
  public readonly scrollBehavior = input<'instant' | 'smooth' | 'auto'>('smooth', {
    alias: 'skipFirstScrollBehavior',
  });

  /**
   * Zusätzlicher oberer Abstand in Pixeln zum Zielanker.
   */
  public readonly topOffset = input(0, { alias: 'skipFirstTopOffset' });
  /* eslint-enable @angular-eslint/no-input-rename */

  /**
   * we do resolve the anchor lazily for we are interested in later changes
   * and want to scroll everytime when the data changed
   */
  private readonly anchor = injectRouteFragment();
  private readonly injector = inject(Injector);
  private readonly parent = inject(ElementRef<HTMLElement>);
  private readonly scrollService = inject(ScrollService);

  ngOnInit(): void {
    const scrollable = injectScrollableParentElement(this.parent.nativeElement as HTMLElement);

    effectSkipFirstIf(
      // all but the first time the anchor is changing the scrolling starts
      () => {
        const queryResult = untracked(() => this.queryResult());
        const anchor = untracked(() => this.anchor());
        const isLoading = untracked(() => queryResult.isLoading());
        // data() is NOT untracked that's why it will inform this effect
        const data = queryResult.data();
        return !!anchor && !!data && !isLoading && !!scrollable;
      },
      // set timeout waits until next render tick to assure the anchor was rendered
      () =>
        setTimeout(() => {
          const anchor = untracked(() => this.anchor());
          // we put a ! to scrollable! for we do know it is part of the condition (above)
          // which decides that we run this code.
          this.scrollService.scroll(anchor ?? '', {
            scrollable: scrollable!,
            behavior: this.scrollBehavior(),
            ignoreWhenInView: 'top',
            topOffset: this.topOffset(),
          });
        }),
      { injector: this.injector },
    );
  }
}
