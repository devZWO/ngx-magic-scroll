/**
 * Ermittelt die Höhe eines Header-Elements anhand eines CSS-Selektors im angegebenen Dokument.
 * Dient der dynamischen Offset-Berechnung für Scroll- und Anchor-Kalkulationen, damit gescrollte
 * Inhalte nicht durch einen fixierten/sticky Header verdeckt werden.
 *
 * @param headerSelector - Der CSS-Selektor des Header-Elements (z. B. `'.header'` oder `'app-header'`).
 * @param document - Die Document-Instanz (z. B. via `DOCUMENT` Token injiziert), in der nach dem Selektor gesucht wird.
 * @returns Die gerundete/absolute Höhe des Headers in Pixeln oder `0`, falls das Element nicht gefunden wurde.
 *
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
