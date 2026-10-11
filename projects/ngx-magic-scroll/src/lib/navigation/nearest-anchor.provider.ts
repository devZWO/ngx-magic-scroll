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
 * Finds the anchor representing the currently read section based on the top activation boundary.
 *
 * Supports scroll-spy behavior to identify the current section while scrolling and
 * synchronize the URL fragment. A section remains active while the user scrolls through
 * its content until the next section reaches the activation boundary.
 *
 * @remarks
 * This service does not use providedIn: 'root'. Register it in application or component
 * providers when using it internally. The facade provides its own instance.
 */
@Injectable()
export class NearestAnchorProvider {
  private readonly document = inject(DOCUMENT);

  /**
   * Calculates the ID of the active anchor based on scroll position and the activation boundary.
   *
   * 1. Evaluates all eligible anchors within the host or document.
   * 2. Determines the activation boundary (`scrollableTop + headerOffset + headerHeight`).
   * 3. Selects the latest anchor whose top edge has crossed the boundary (`top <= boundary + 1px`).
   * 4. Falls back to the first anchor if no anchor has crossed the boundary yet.
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
    const boundary = (isDocument ? 0 : scrollable.getBoundingClientRect().top) + offset;

    // Subpixel tolerance (1px) for browser rounding
    const passedAnchors = anchors.filter((el) => el.getBoundingClientRect().top <= boundary + 1);

    if (passedAnchors.length > 0) {
      // Pick the anchor that crossed the boundary most recently (highest top <= boundary)
      const active = passedAnchors.reduce((best, el) =>
        el.getBoundingClientRect().top > best.getBoundingClientRect().top ? el : best,
      );
      return active.id;
    }

    // Before any anchor has reached the boundary, select the first anchor
    const first = anchors.reduce((best, el) =>
      el.getBoundingClientRect().top < best.getBoundingClientRect().top ? el : best,
    );
    return first.id;
  }
}
