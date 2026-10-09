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
 * Finds the anchor nearest the top edge of the visible scroll area.
 *
 * Supports scroll-spy behavior to identify the current section while scrolling and
 * synchronize the URL fragment.
 *
 * @remarks
 * This service does not use providedIn: 'root'. Register it in application or component
 * providers when using it internally. The facade provides its own instance.
 */
@Injectable()
export class NearestAnchorProvider {
  private readonly document = inject(DOCUMENT);

  /**
   * Calculates the ID of the anchor nearest the visible top edge.
   *
   * 1. Finds matching elements using selector within hostElement, or within document.
   * 2. Excludes elements whose top edge lies above the configured offset.
   * 3. Selects the remaining element nearest the top edge.
   *
   * @param options - Host element, selector, scroll container and header-offset settings.
   * @returns The nearest anchor's element ID, or undefined if no eligible element exists.
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
    const scrollable =
      options?.scrollable ??
      (options?.hostElement ? injectScrollableParentElement(options.hostElement) : undefined);
    const isDocument =
      scrollable === this.document.documentElement || scrollable === this.document.body;
    const top = (isDocument ? 0 : (scrollable?.getBoundingClientRect().top ?? 0)) + offset;
    // Browser scroll positions may round fractional header heights to whole pixels.
    const visibleAnchors = anchors.filter((el) => el.getBoundingClientRect().top >= top - 1);

    // Iterates through all anchors and calculates their distance to the current scroll position (in pixels)
    const closest = visibleAnchors.reduce(
      (closest, el) => {
        // Retrieves the distance of the element to the top edge of the viewport
        const offset = Math.abs(el.getBoundingClientRect().top);

        // Compares the current distance with the smallest distance so far
        // and keeps track of the closer element
        return offset < closest.offset
          ? { el, offset } // if closer: replace the previous one
          : closest; // otherwise: keep the previous one
      },
      {
        el: null as HTMLElement | null, // Initial value: no element
        offset: Number.POSITIVE_INFINITY, // Initial value: maximum distance
      },
    );

    return closest.el?.id;
  }
}
