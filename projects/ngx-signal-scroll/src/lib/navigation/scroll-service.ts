import { inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/**
 * Options for a scroll operation performed by ScrollService.
 */
export interface ScrollOptions {
  /**
   * Scrollable container. Defaults to the document's scrolling element.
   */
  scrollable?: HTMLElement;
  /**
   * Scroll behavior: 'instant' for an immediate jump, 'smooth' for animation,
   * or 'auto' to follow the browser's CSS scroll behavior. Defaults to 'instant'.
   */
  behavior?: ScrollBehavior;
  /**
   * Visibility condition under which scrolling is skipped:
   * - 'none': Always scroll (default).
   * - 'top': Skip when the element's top edge is visible.
   * - 'full': Skip when the entire element is visible.
   * - 'always': Skip when either the top or bottom edge is visible.
   */
  ignoreWhenInView?: 'none' | 'top' | 'full' | 'always';
  /**
   * Additional top offset for the target, in pixels, for example for a header or padding.
   * Defaults to 20 pixels.
   */
  topOffset?: number;
}

/**
 * Central service for scrolling to DOM elements and anchors.
 *
 * Supports explicit scroll containers or document scrolling, configurable header offsets,
 * visibility checks to avoid unnecessary movement, and smooth or instant scrolling.
 */
@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  private readonly document = inject<Document>(DOCUMENT);
  private readonly TOP_OFFSET = 20;

  /**
   * Scrolls to the element identified by its ID.
   *
   * @param anchor - Target HTML element ID, with or without a leading #.
   * @param options - Scroll container, behavior, offset and visibility settings.
   * @returns True when the target exists and scrolling is initiated; otherwise false.
   * @example
   * ```ts
   * // Simple scrolling
   * scrollService.scroll('section-details');
   *
   * // With options
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
