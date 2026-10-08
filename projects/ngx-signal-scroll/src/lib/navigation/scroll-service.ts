import { inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/**
 * Optionen für die Ausführung eines Scroll-Vorgangs über den `ScrollService`.
 */
export interface ScrollOptions {
  /**
   * Das übergeordnete scrollbare Container-Element.
   * Standardmäßig das scrollende Dokument-Element.
   */
  scrollable?: HTMLElement;
  /**
   * Scroll-Verhalten: `'instant'` (sofortiger Sprung) oder `'smooth'` (weiche Animation).
   * Standardmäßig `'instant'`.
   */
  behavior?: ScrollBehavior;
  /**
   * Bedingung, unter der das Scrollen übersprungen werden soll, wenn sich das Ziel bereits im Viewport befindet:
   * - `'none'`: Immer scrollen (Standard).
   * - `'top'`: Scrollen überspringen, wenn die Oberkante des Elements bereits im Sichtbereich ist.
   * - `'full'`: Scrollen überspringen, wenn das Element vollständig sichtbar ist.
   * - `'always'`: Scrollen überspringen, wenn die Ober- oder Unterkante sichtbar ist.
   */
  ignoreWhenInView?: 'none' | 'top' | 'full' | 'always';
  /**
   * Zusätzlicher oberer Abstand in Pixeln zum Ziel (z. B. für Header oder Padding).
   * Standardmäßig `20` Pixel.
   */
  topOffset?: number;
}

/**
 * Zentraler Service für standardisierte und kontrollierte Scroll-Vorgänge zu DOM-Elementen / Ankern.
 *
 * Unterstützt:
 * - Gezieltes Scrollen innerhalb beliebiger Container (`scrollable`) oder des gesamten Viewports.
 * - Konfigurierbare Offsets (z. B. zum Ausgleich fixer Header).
 * - Sichtbarkeitsprüfungen (`ignoreWhenInView`), um unnötige Ruckler zu vermeiden.
 * - Weiches (`smooth`) oder sofortiges (`instant`) Scrollverhalten.
 */
@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  private readonly document = inject<Document>(DOCUMENT);
  private readonly TOP_OFFSET = 20;

  /**
   * Führt einen Scroll-Vorgang zu dem durch die ID angegebenen Element aus.
   *
   * @param anchor - Die HTML-Element-ID des Ziels (ohne oder mit vorangestelltem `#`).
   * @param options - Optionale Parameter für Scrollable-Container, Verhalten, Offsets und Sichtbarkeitsfilter.
   * @returns `true`, wenn das Ziel-Element gefunden und der Scroll-Vorgang ausgelöst wurde; andernfalls `false`.
   *
   * @example
   * ```ts
   * // Einfaches Scrollen
   * scrollService.scroll('section-details');
   *
   * // Mit Optionen
   * scrollService.scroll('card-123', {
   *   scrollable: scrollContainerElement,
   *   behavior: 'smooth',
   *   topOffset: 80,
   *   ignoreWhenInView: 'top'
   * });
   * ```
   */
  scroll(anchor: string, options?: ScrollOptions): boolean {
    const elementId = anchor.startsWith('#') ? anchor.slice(1) : anchor;
    const el = this.document.getElementById(elementId);

    if (!el) {
      return false;
    }

    const scrollable =
      options?.scrollable ??
      (this.document.scrollingElement as HTMLElement | null) ??
      this.document.documentElement;
    const behavior = options?.behavior ?? 'instant';
    const ignoreWhenInView = options?.ignoreWhenInView ?? 'none';
    const topOffset = options?.topOffset ?? this.TOP_OFFSET;

    const rect = el.getBoundingClientRect();
    const isDocument =
      scrollable === this.document.documentElement || scrollable === this.document.body;
    const containerTop = isDocument ? 0 : scrollable.getBoundingClientRect().top;
    const viewportHeight = isDocument
      ? this.document.documentElement.clientHeight
      : scrollable.clientHeight;
    const isTopInView =
      rect.top >= containerTop + topOffset - 1 && rect.top < containerTop + viewportHeight;
    const isBottomInView =
      rect.bottom <= containerTop + viewportHeight && rect.bottom > containerTop;

    if (
      (ignoreWhenInView == 'top' && isTopInView) ||
      (ignoreWhenInView == 'full' && isTopInView && isBottomInView) ||
      (ignoreWhenInView == 'always' && (isTopInView || isBottomInView))
    ) {
      return false;
    }

    // One operation keeps offsets accurate during smooth scrolling and only moves the selected container.
    scrollable.scrollTo({
      top: scrollable.scrollTop + rect.top - containerTop - topOffset,
      behavior,
    });

    return true;
  }
}
