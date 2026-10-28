/** The three series colours from the design, as token references. */
export const SERIES_TOKENS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'] as const;

/**
 * Colour for the i-th series: the design's three tokens first, then a deterministic hue walk so a
 * node with more than three children still gets distinct, stable colours (DECISIONS #17).
 */
export function seriesColor(index: number, palette: readonly string[] = SERIES_TOKENS): string {
  const fromPalette = palette[index];
  if (fromPalette !== undefined) return fromPalette;
  const hue = Math.round((index * 137.508) % 360); // golden-angle spacing
  return `hsl(${hue} 50% 70%)`;
}
