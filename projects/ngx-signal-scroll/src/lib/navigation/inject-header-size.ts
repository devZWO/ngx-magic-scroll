/**
 * Measures the height of a header selected within the supplied document.
 * Used to calculate scroll and anchor offsets so a fixed or sticky header does not
 * cover the scrolled content.
 *
 * @param headerSelector - Header CSS selector, such as '.header' or 'app-header'.
 * @param document - Document instance in which to search, for example injected through DOCUMENT.
 * @returns The absolute header height in pixels, or 0 if the element is not found.
 * @example
 * ```ts
 * const document = inject(DOCUMENT);
 * const height = injectedHeaderHeight('.header', document);
 * ```
 */
export function injectedHeaderHeight(headerSelector: string, document: Document): number {
  const boundingBox = document.querySelector<HTMLElement>(headerSelector)?.getBoundingClientRect();
  if (!boundingBox) {
    console.warn('No boundingBox found for headerSelector: ', headerSelector);
    return 0;
  }

  return Math.abs(boundingBox.height);
}
