import { ElementRef, inject } from '@angular/core';

/**
 * Ermittelt das am nächsten liegende scrollbare Eltern-Element (Ancestor) im DOM.
 *
 * Sucht rekursiv entlang des DOM-Baums nach einem Element mit `overflow-y: auto` oder `overflow-y: scroll`.
 * Kann entweder innerhalb eines Angular-Injektionskontexts (nutzt dann `ElementRef.nativeElement` als Startpunkt)
 * oder durch direkte Übergabe eines `hostElement` aufgerufen werden.
 *
 * @param hostElement - Optionales HTML-Element als Ausgangspunkt der Suche.
 *                      Wird ein Element übergeben, hat dieses Vorrang vor dem Injektionskontext.
 *                      Wird keines übergeben, wird `ElementRef<HTMLElement>` über `inject()` aufgelöst.
 * @returns Das nächste übergeordnete scrollbare `HTMLElement` oder `undefined`, falls keines existiert.
 *
 * @example
 * ```ts
 * // Innerhalb eines Injection Contexts (z. B. Directive / Component Constructor):
 * const scrollParent = injectScrollableParentElement();
 *
 * // Außerhalb eines Injection Contexts:
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
