import { Directive, ElementRef, inject, Injector, input, OnInit, untracked } from '@angular/core';
import { injectRouteFragment } from './inject-route-fragment';
import { ScrollDataSource } from './scroll-data-source';
import { effectSkipFirstIf } from '../effects/effect-skip-first-if';
import { injectScrollableParentElement } from './inject-scrollable-parent';
import { ScrollService } from './scroll-service';

/**
 * Restores the URL anchor after subsequent data changes.
 *
 * Unlike ScrollToFragmentOnFirstDataDirective, skips the first load through effectSkipFirstIf.
 * Reacts to later updates, such as pagination, refetching or filter changes, to keep the
 * current anchor visible when DOM changes have moved the target.
 * @example
 * ```html
 * <div
 *   [appScrollingOnDataChange]="myInfiniteQuery"
 *   [skipFirstScrollBehavior]="'smooth'"
 *   [skipFirstTopOffset]="20"
 * >
 *   <!-- Dynamically updated data list -->
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
   * Provider-neutral data source whose updates are observed.
   */
  public readonly queryResult = input.required<ScrollDataSource>({
    alias: 'appScrollingOnDataChange',
  });

  /**
   * Scroll behavior for data changes ('instant', 'smooth' or 'auto').
   * Defaults to 'smooth'.
   */
  public readonly scrollBehavior = input<'instant' | 'smooth' | 'auto'>('smooth', {
    alias: 'skipFirstScrollBehavior',
  });

  /**
   * Additional top offset, in pixels, for the target anchor.
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
        const queryResult = this.queryResult();
        const anchor = untracked(() => this.anchor());
        const isLoading = queryResult.isLoading();
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
