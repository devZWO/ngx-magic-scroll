import { EffectRef, effect, Injector } from '@angular/core';

/**
 * Creates an Angular effect that runs its action starting with the second successful
 * predicate evaluation (predicate() === true).
 *
 * Counts and skips the first successful evaluation. Useful for distinguishing an initial
 * load from subsequent updates such as refetching, filtering or pagination.
 *
 * @param predicate - Boolean predicate. Signals read within it are tracked.
 * @param action - Side effect to run from the second successful predicate evaluation onward.
 * @param options - Optional effect settings, such as an explicit Injector.
 * @returns The created EffectRef.
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
  options?: { injector: Injector },
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
