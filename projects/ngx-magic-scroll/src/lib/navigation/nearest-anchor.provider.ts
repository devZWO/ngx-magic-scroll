import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { injectScrollableParentElement } from './inject-scrollable-parent';
import { injectedHeaderHeight } from './inject-header-size';

/**
 * Options for finding the nearest anchor.
 */
export interface NearestAnchorOptions {
  /** Explicit scroll container, including a host that is itself scrollable. */
  scrollable?: HTMLElement;
  /** Preselected anchor elements (e.g. scoped, explicit anchors in the facade). */
  anchors?: readonly HTMLElement[];
  /**
   * Optional host element within which to find anchor elements.
   * Defaults to searching the entire Document.
   */
  hostElement?: HTMLElement;
  /**
   * CSS selector for eligible anchors, for example '[id^="item-card-"]'.
   * Defaults to '[id]'.
   */
  selector?: string;
  /**
   * Static top offset, in pixels, such as a fixed gap or padding.
   */
  headerOffset?: number;
  /**
   * CSS selector for a fixed or sticky header, for example '.header'.
   * Its measured height is added to the offset so covered elements are not selected
   * as the topmost visible anchor.
   */
  headerSelector?: string;
}

/**
 * Finds the anchor representing the currently read section based on full containment and activation boundaries.
 *
 * Supports scroll-spy behavior to identify the current section while scrolling and
 * synchronize the URL fragment. A section is activated immediately when fully visible in the
 * viewport below sticky headers, or remains active while scrolling through its content until
 * the next section crosses the activation boundary or becomes fully visible.
 *
 * @remarks
 * This service does not use providedIn: 'root'. Register it in application or component
 * providers when using it internally. The facade provides its own instance.
 */
@Injectable()
export class NearestAnchorProvider {
  private readonly document = inject(DOCUMENT);

  /**
   * Calculates the ID of the active anchor based on scroll position and visible area boundaries.
   *
   * 1. Evaluates all eligible anchors within the host or document.
   * 2. Determines the visible reading area (`topBoundary = scrollableTop + headerOffset + headerHeight`, `bottomBoundary = containerBottom | viewportHeight`).
   * 3. Prioritizes fully contained anchors (`top >= topBoundary - 1` and `bottom <= bottomBoundary + 1`), selecting the topmost one.
   * 4. Falls back to the anchor that crossed `topBoundary` most recently (`top <= topBoundary + 1`).
   * 5. Falls back to the first anchor if no anchor has crossed the boundary yet.
   *
   * @param options - Host element, selector, scroll container and header-offset settings.
   * @returns The active anchor's element ID, or undefined if no eligible element exists.
   * @example
   * ```ts
   * const nearestId = nearestAnchorProvider.getNearestAnchor({
   *   hostElement: listContainer,
   *   selector: '[id^="card-"]',
   *   headerSelector: '.app-header'
   * });
   * ```
   */
  public getNearestAnchor(options?: NearestAnchorOptions): string | undefined {
    const host = options?.hostElement ?? this.document;
    const selector = options?.selector ?? '[id]';
    const offset =
      (options?.headerOffset ?? 0) +
      (options?.headerSelector ? injectedHeaderHeight(options.headerSelector, this.document) : 0);

    // Collects all HTML elements with an id – these are our potential anchor targets
    const anchors = options?.anchors ?? Array.from(host.querySelectorAll<HTMLElement>(selector));
    if (anchors.length === 0) {
      return undefined;
    }

    const scrollable =
      options?.scrollable ??
      (options?.hostElement ? injectScrollableParentElement(options.hostElement) : undefined);
    const isDocument =
      !scrollable ||
      scrollable === this.document.documentElement ||
      scrollable === this.document.body;
    const topBoundary = (isDocument ? 0 : scrollable.getBoundingClientRect().top) + offset;
    const bottomBoundary = isDocument
      ? (this.document.defaultView?.innerHeight ?? this.document.documentElement.clientHeight)
      : scrollable.getBoundingClientRect().bottom;

    // 1. Check for fully contained anchors (entire element inside visible reading area)
    const containedAnchors = anchors.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= topBoundary - 1 && rect.bottom <= bottomBoundary + 1;
    });

    if (containedAnchors.length > 0) {
      // Topmost fully visible anchor
      const topmostContained = containedAnchors.reduce((best, el) =>
        el.getBoundingClientRect().top < best.getBoundingClientRect().top ? el : best,
      );
      return topmostContained.id;
    }

    // 2. Reading line fallback: Anchor that crossed topBoundary most recently
    const passedAnchors = anchors.filter((el) => el.getBoundingClientRect().top <= topBoundary + 1);

    if (passedAnchors.length > 0) {
      // Pick the anchor that crossed the boundary most recently (highest top <= topBoundary)
      const active = passedAnchors.reduce((best, el) =>
        el.getBoundingClientRect().top > best.getBoundingClientRect().top ? el : best,
      );
      return active.id;
    }

    // 3. Before any anchor has reached the boundary, select the first anchor
    const first = anchors.reduce((best, el) =>
      el.getBoundingClientRect().top < best.getBoundingClientRect().top ? el : best,
    );
    return first.id;
  }
}
