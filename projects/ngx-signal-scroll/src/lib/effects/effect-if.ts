import {EffectRef, effect, Injector} from "@angular/core";

/**
 * Erstellt einen Angular `effect`, der die angegebene Aktion nur ausführt, wenn die Bedingung (`predicate`) `true` ergibt.
 *
 * Reagiert reaktiv auf Änderungen aller Signals, die innerhalb des `predicate` ausgewertet werden.
 *
 * @param predicate - Eine Funktion, die einen booleschen Wert zurückgibt. Signale innerhalb dieser Funktion werden getrackt.
 * @param action - Die Seiteneffekt-Aktion, die ausgeführt wird, wenn `predicate()` wahr ist.
 * @param options - Optionale Parameter (z. B. Angabe eines expliziten `Injector`s außerhalb des Erstellungskontexts).
 * @returns Die erstellte `EffectRef`-Instanz.
 *
 * @example
 * ```ts
 * effectIf(
 *   () => this.isLoaded() && !!this.data(),
 *   () => console.log('Data is ready:', this.data())
 * );
 * ```
 */
export function effectIf(
  predicate: () => boolean,
  action: () => void,
  options?: { injector: Injector }
): EffectRef {
  return effect(() => {
    if (predicate()) {
      action();
    }
  }, options);
}
