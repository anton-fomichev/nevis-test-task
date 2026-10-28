import type { ChartSeries } from './toChartSeries';

export interface StackedSegment {
  seriesId: string;
  value: number;
  /** Top edge in plot coordinates (px from the top of the plot area). */
  y: number;
  height: number;
}

export interface StackedColumn {
  monthIndex: number;
  month: string;
  total: number;
  /** Top edge of the whole stack in plot coordinates. */
  top: number;
  height: number;
  /** Bottom → top, in series order. Always one segment per series, zero-height when the value is 0. */
  segments: StackedSegment[];
}

export interface AxisTick {
  value: number;
  /** Position in plot coordinates (px from the top). */
  y: number;
}

export interface StackedLayout {
  /** Plot height in px, as given. */
  height: number;
  /** Top of the y axis: the smallest multiple of `niceStep` ≥ the largest column total. */
  max: number;
  ticks: AxisTick[];
  columns: StackedColumn[];
  /** Maps a value to a height in px. */
  scale: (value: number) => number;
}

export interface StackedLayoutOptions {
  /** Plot area height in px. Default 320 (the design). */
  height?: number;
  /** Number of y-axis ticks including 0 and `max`. Default 5 (the design shows 0…400). */
  tickCount?: number;
  /** The axis max is rounded up to a multiple of this. Default 100. */
  niceStep?: number;
}

/**
 * Pure layout for a stacked bar chart: given series and month labels, returns every segment's
 * vertical geometry, the axis ticks and the scale. Horizontal placement is left to the renderer
 * (columns are equal-width flex items in the design), which keeps this function free of
 * measurements and trivially unit-testable.
 */
export function buildStackedLayout(
  series: readonly ChartSeries[],
  months: readonly string[],
  options: StackedLayoutOptions = {},
): StackedLayout {
  const { height = 320, tickCount = 5, niceStep = 100 } = options;
  if (height <= 0) throw new RangeError('height must be > 0');
  if (tickCount < 2) throw new RangeError('tickCount must be ≥ 2');
  if (niceStep <= 0) throw new RangeError('niceStep must be > 0');

  const totals = months.map((_, monthIndex) =>
    series.reduce((sum, s) => sum + (s.values[monthIndex] ?? 0), 0),
  );
  const maxTotal = Math.max(0, ...totals);
  // A chart with only zeros still needs a non-degenerate axis.
  const max = Math.max(niceStep, Math.ceil(maxTotal / niceStep) * niceStep);
  const scale = (value: number) => (value / max) * height;

  const ticks: AxisTick[] = Array.from({ length: tickCount }, (_, i) => {
    const value = (max / (tickCount - 1)) * i;
    return { value, y: height - scale(value) };
  });

  const columns: StackedColumn[] = months.map((month, monthIndex) => {
    let cumulative = 0;
    const segments: StackedSegment[] = series.map((s) => {
      const value = s.values[monthIndex] ?? 0;
      const segmentHeight = scale(value);
      cumulative += value;
      return { seriesId: s.id, value, y: height - scale(cumulative), height: segmentHeight };
    });
    const total = totals[monthIndex] ?? 0;
    return {
      monthIndex,
      month,
      total,
      top: height - scale(total),
      height: scale(total),
      segments,
    };
  });

  return { height, max, ticks, columns, scale };
}
