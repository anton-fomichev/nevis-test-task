/** Query params the API understands in development (DECISIONS #4). */
const DEV_FLAGS = ['delay', 'fail'] as const;

/**
 * Picks the dev-only flags out of the page's query string so `/?delay=2000` or `/?fail=1` on the
 * dashboard reaches the API as `/api/clients?delay=2000`. Anything else is dropped.
 * Returns `""` or a string starting with `?`.
 */
export function devFlagsFrom(search: string): string {
  const source = new URLSearchParams(search);
  const forwarded = new URLSearchParams();
  for (const flag of DEV_FLAGS) {
    const value = source.get(flag);
    if (value !== null && value !== '') forwarded.set(flag, value);
  }
  const query = forwarded.toString();
  return query ? `?${query}` : '';
}
