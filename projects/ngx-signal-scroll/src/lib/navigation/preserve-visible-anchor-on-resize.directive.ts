import { Directive, ElementRef, inject, input } from '@angular/core';
import { linkedRouteFragment } from './linked-route-fragment';
import { injectScrollableParentElement } from './inject-scrollable-parent';
import { ScrollService } from './scroll-service';

/**
 * Scrolls instantly to the current URL anchor when the browser window resizes (window:resize).
 *
 * Keeps the active section visible after viewport changes, such as showing or hiding
 *  toolbars or DevTools, or changing device orientation.
 *
 * @remarks
 * Use as a host directive (hostDirectives: [PreserveVisibleAnchorOnResize]) or as an
 * attribute directive on a component or HTML element, rather than a pseudo-element such as ng-container.
 * @example
 * ```ts
 * @Component({
 *   selector: 'app-list-view',
 *   imports: [NearestAnchorScrollHook],
 *   hostDirectives: [PreserveVisibleAnchorOnResize],
 *   ...
 * })
 * ```
 */
@Directive({
  selector: '[appPreserveVisibleAnchorOnResize]',
  host: {
    '(window:resize)': 'scrollToAnchor()',
  },
})
export class PreserveVisibleAnchorOnResize {
  /**
   * Additional top offset, in pixels, when correcting the scroll position.
   */
  public readonly topOffset = input(0);

  /**
   * Optional anchor-ID prefix to restrict restoration to relevant anchors.
   */
  public readonly preserveSelectorPrefix = input<string>('');

  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly scrollService = inject(ScrollService);
  private readonly routeFragment = linkedRouteFragment();

  /**
   * Immediately scrolls to the current URL fragment.
   */
  protected scrollToAnchor(): void {
    const fragment = this.routeFragment();
    if (!fragment || !fragment.startsWith(this.preserveSelectorPrefix())) {
      return;
    }
    const anchor = `#${fragment}`;
    const scrollable = injectScrollableParentElement(this.hostElement.nativeElement as HTMLElement);
    this.scrollService.scroll(anchor, { scrollable: scrollable, topOffset: this.topOffset() });
  }
}
