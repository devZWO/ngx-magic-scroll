import { Directive, ElementRef, inject, Injector, input, OnInit } from '@angular/core';
import { injectRouteFragment } from './inject-route-fragment';
import { effectOnceIf } from '../effects/effect-once-if';
import { ScrollDataSource } from './scroll-data-source';
import { ScrollService } from './scroll-service';
import { injectScrollableParentElement } from './inject-scrollable-parent';

/**
 * Scrolls once to the initial URL anchor (#fragment) after asynchronous data first loads successfully.
 *
 * When a page is opened with a fragment, the target may not yet exist in the DOM because
 * its data is loaded asynchronously. Scrolls exactly once when queryResult.data() is
 * available and isLoading() is false.
 * @example
 * ```html
 * <div
 *   [appScrollingOnFirstData]="myInfiniteQuery"
 *   [onlyOnceScrollBehavior]="'instant'"
 *   [onlyOnceTopOffset]="20"
 * >
 *   <!-- List of asynchronously loaded elements -->
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
   * Provider-neutral data source whose loading and data state are observed.
   */
  public readonly queryResult = input.required<ScrollDataSource>({
    alias: 'appScrollingOnFirstData',
  });

  /**
   * Scroll behavior for the initial jump ('instant', 'smooth' or 'auto').
   * Defaults to 'instant'.
   */
  public readonly scroll = input<'instant' | 'smooth' | 'auto'>('instant', {
    alias: 'onlyOnceScrollBehavior',
  });

  /**
   * Additional top offset, in pixels, for the target anchor.
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
            behavior: this.scroll(),
          });
        });
      },

      { injector: this.injector },
    );
  }
}
