import { Directive, ElementRef, inject, input } from '@angular/core';
import { linkedRouteFragment } from './linked-route-fragment';
import { injectScrollableParentElement } from './inject-scrollable-parent';
import { ScrollService } from './scroll-service';

/**
 * Direktive, die bei einer Größenänderung des Browserfensters (`window:resize`)
 * automatisch und verzögerungsfrei (`instant`) zum aktuellen Anker der URL scrollt.
 *
 * Dadurch bleibt der aktive Ankerabschnitt auch bei dynamischen Viewport-Änderungen
 * (z. B. Ein-/Ausblenden von Toolbars, DevTools, Orientierungswechsel) im sichtbaren Bereich.
 *
 * @remarks
 * Kann als Host-Direktive (`hostDirectives: [PreserveVisibleAnchorOnResize]`) oder als Attribut-Direktive
 * an einer Komponente bzw. einem HTML-Element angebracht werden (nicht an Pseudo-Elementen wie `<ng-container>`).
 *
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
   * Zusätzlicher oberer Abstand in Pixeln beim Nachjustieren der Scrollposition.
   */
  public readonly topOffset = input(0);

  /**
   * Optionales Präfix für Anker-IDs, um nur auf fachlich relevante Anker zu reagieren.
   */
  public readonly preserveSelectorPrefix = input<string>('');

  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly scrollService = inject(ScrollService);
  private readonly routeFragment = linkedRouteFragment();

  /**
   * Führt das sofortige Re-Scrolling zum aktuellen URL-Fragment aus.
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
