import {EffectRef, effect, Injector} from "@angular/core";

/**
 * Erstellt einen Angular `effect`, der die angegebene Aktion erst ab dem **zweiten** erfolgreichen
 * Eintreffen der Bedingung (`predicate() === true`) ausführt.
 *
 * Das allererste Mal, wenn `predicate()` wahr wird, wird gezählt und übersprungen.
 * Dies ist besonders nützlich, wenn initiale Ladezustände von nachfolgenden Updates (z. B. Refetches,
 * Filteränderungen, Paging) unterschieden werden sollen.
 *
 * @param predicate - Eine Funktion, die einen booleschen Wert liefert. Signale darin werden getrackt.
 * @param action - Die Seiteneffekt-Aktion, die erst ab dem zweiten Zutreffen von `predicate()` aufgerufen wird.
 * @param options - Optionale Parameter (z. B. Angabe eines expliziten `Injector`s).
 * @returns Die erstellte `EffectRef`-Instanz.
 *
 * @example
 * ```ts
 * effectSkipFirstIf(
 *   () => !!this.query.data() && !this.query.isLoading(),
 *   () => console.log('Data was updated after initial load:', this.query.data())
 * );
 * ```
 */
export function effectSkipFirstIf(
  predicate: () => boolean,
  action: () => void,
  options?: { injector: Injector }
): EffectRef {
  let triggerCount = 0;

  return effect(() => {
    if (predicate()) {
      triggerCount++;
      if (triggerCount > 1) {
        action();
      }
    }
  }, options);
}
