// `en-US` on purpose: `en-GB` renders September as "Sept", the design shows "Sep" (DECISIONS #30).
const formatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const ISO_MONTH = /^(\d{4})-(\d{2})$/;

/** `"2024-02"` → `"Feb 2024"`. Throws on anything that is not `YYYY-MM`. */
export function formatMonth(isoMonth: string): string {
  const match = ISO_MONTH.exec(isoMonth);
  if (!match) throw new RangeError(`formatMonth: expected YYYY-MM, got "${isoMonth}"`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12)
    throw new RangeError(`formatMonth: month out of range in "${isoMonth}"`);
  return formatter.format(new Date(Date.UTC(year, month - 1, 1)));
}
