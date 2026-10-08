import { isSignal, Signal } from '@angular/core';
import { ScrollDataSource } from '../navigation/scroll-data-source';

/** Structural Angular resource contract; no dependency on a data-fetching provider. */
export interface ScrollResource {
  readonly value: () => unknown;
  readonly isLoading: () => boolean;
  readonly hasValue?: () => boolean;
}

/**
 * Pass a signal (also computed/input/model signals), a resource/rxResource, or
 * reactive data()/isLoading() getters. Plain input values are supported too.
 * For signal forms pass the field's value signal, e.g. `form().value`.
 * Supabase data and loading signals can use the neutral ScrollDataSource contract.
 */
export type ScrollSource =
  | Signal<unknown>
  | ScrollResource
  | ScrollDataSource
  | object
  | string
  | number
  | boolean
  | null
  | undefined;

export const NO_SCROLL_SOURCE = Symbol('Static, already rendered data');

/** Internal readiness adapter. null/undefined wait; [], 0, false and '' are ready. */
export function readScrollSource(source: ScrollSource | typeof NO_SCROLL_SOURCE): {
  ready: boolean;
  data: unknown;
} {
  if (source === NO_SCROLL_SOURCE) return { ready: true, data: source };
  let data: unknown = source;
  while (isSignal(data)) data = data();
  if (
    data !== null &&
    typeof data === 'object' &&
    'isLoading' in data &&
    typeof data.isLoading === 'function'
  ) {
    if (data.isLoading()) return { ready: false, data: undefined };
    if ('value' in data && typeof data.value === 'function') {
      const resource = data as ScrollResource;
      // Reading an Angular resource's value in an error state can throw.
      data = resource.hasValue && !resource.hasValue() ? undefined : resource.value();
    } else if ('data' in data && typeof data.data === 'function') {
      data = data.data();
    }
  }
  return { ready: data !== undefined && data !== null, data };
}
