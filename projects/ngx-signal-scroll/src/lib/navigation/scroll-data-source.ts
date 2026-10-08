/** Reactive getters must read signals so loading and data changes are tracked.
 * rxResource: { data: () => resource.value(), isLoading: resource.isLoading }.
 * TanStack results already satisfy this contract. Supabase results can be stored in signals.
 */
export interface ScrollDataSource {
  readonly data: () => unknown;
  readonly isLoading: () => boolean;
}
