import { ElementRef, inject } from '@angular/core';

/**
 * Finds the closest scrollable ancestor in the DOM.
 *
 * Walks up the DOM tree looking for overflow-y: auto or overflow-y: scroll.
 * Call within an Angular injection context to start at ElementRef.nativeElement,
 * or pass a hostElement explicitly.
 *
 * @param hostElement - Optional starting element. An explicit element takes precedence;
 * otherwise the starting element is obtained by injecting ElementRef<HTMLElement>.
 * @returns The closest scrollable HTMLElement, or undefined if none exists.
 * @example
 * ```ts
 * // Within an injection context (for example a directive or component constructor):
 * const scrollParent = injectScrollableParentElement();
 *
 * // Outside an injection context:
 * const scrollParent = injectScrollableParentElement(myHtmlElement);
 * ```
 */
export function injectScrollableParentElement(
  hostElement?: HTMLElement | null,
): HTMLElement | undefined {
  function findScrollableParent(el: HTMLElement): HTMLElement | undefined {
    let current = el.parentElement ?? undefined;
    while (current) {
      const overflowY = getComputedStyle(current).overflowY;
      if (
        overflowY === 'auto' ||
        overflowY === 'scroll' /**&& current.scrollHeight > current.clientHeight **/
      ) {
        return current;
      }
      current = current.parentElement ?? undefined;
    }
    return undefined;
  }

  return findScrollableParent(
    hostElement ?? (inject(ElementRef<HTMLElement>).nativeElement as HTMLElement),
  );
}
