/**
 * Parses a route `[id]` segment into a positive database id.
 *
 * Strict decimal only. `Number()` alone accepts `0x10`, `1e3`, and ` 7 `, and
 * `Number.isInteger` accepts `1e20`, which is past both JavaScript's safe
 * integer range and a BIGINT UNSIGNED column. Anything else is not an id.
 */
export function parsePositiveId(raw: string | undefined): number | null {
  if (!raw || !/^[1-9]\d{0,15}$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}
