import { useId, useMemo } from 'react';

import { formatMonth as defaultFormatMonth } from '../../../../shared/lib';
import { VisuallyHidden } from '../../../../shared/ui';
import { buildStackedLayout, type ChartSeries } from '../../model';
import { Legend } from '../Legend/Legend';
import styles from './StackedBarChart.module.css';
import { seriesColor } from './palette';

export interface StackedBarChartProps {
  /** Series stacked bottom → top in array order. */
  series: readonly ChartSeries[];
  /** ISO months (`YYYY-MM`), one per column. */
  months: readonly string[];
  /** What the picture shows, for `role="img"`. Mention the unit and the period. */
  label: string;
  /** Plot height in px. Default 320 (the design). */
  height?: number | undefined;
  /** Colours by series index. Default: the three design tokens, then a deterministic hue walk. */
  colors?: readonly string[] | undefined;
  /** Axis/label formatter. Default `"2024-02"` → `"Feb 2024"`. */
  formatMonth?: ((isoMonth: string) => string) | undefined;
}

/**
 * Stacked bar chart, hand-rolled: `buildStackedLayout` does the maths, this component only draws.
 * Columns are equal-width flex items; each stack is a rounded, clipped box with its own SVG.
 * Accessibility: the drawing is one `role="img"` with `label`; a visually-hidden table carries
 * the same numbers; the legend is a real list.
 */
export function StackedBarChart({
  series,
  months,
  label,
  height = 320,
  colors,
  formatMonth = defaultFormatMonth,
}: StackedBarChartProps) {
  const layout = useMemo(
    () => buildStackedLayout(series, months, { height }),
    [series, months, height],
  );
  const colorOf = (index: number) => seriesColor(index, colors);
  const tableId = useId();
  const monthLabels = months.map(formatMonth);

  return (
    <figure className={styles.figure}>
      {/* Only the drawing scrolls on narrow screens; the legend stays centred in the card. */}
      <div className={styles.scroller}>
        <div className={styles.chart}>
          {/* The drawing. Everything inside is hidden from AT behind the single label. */}
          <div role="img" aria-label={label} style={{ display: 'contents' }}>
            <div className={styles.yAxis} style={{ height }}>
              {layout.ticks.map((tick) => (
                <span key={tick.value} className={`${styles.tick} tnum`} style={{ top: tick.y }}>
                  {tick.value}
                </span>
              ))}
            </div>
            <div className={styles.plot} style={{ height }}>
              <svg className={styles.grid} aria-hidden="true" focusable="false">
                {layout.ticks.map((tick) => (
                  <line
                    key={tick.value}
                    className={styles.gridLine}
                    x1="0"
                    x2="100%"
                    y1={tick.y}
                    y2={tick.y}
                  />
                ))}
              </svg>
              {layout.columns.map((column) => (
                <div key={column.month} className={styles.column} data-column={column.month}>
                  <div className={styles.stack} style={{ height: column.height }}>
                    <svg
                      className={styles.stackSvg}
                      height={column.height}
                      aria-hidden="true"
                      focusable="false"
                    >
                      {column.segments.map((segment, index) => (
                        <rect
                          key={segment.seriesId}
                          x="0"
                          y={segment.y - column.top}
                          width="100%"
                          height={segment.height}
                          style={{ fill: colorOf(index) }}
                          data-series={segment.seriesId}
                          data-value={segment.value}
                        />
                      ))}
                    </svg>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.xAxis}>
              {monthLabels.map((text, index) => (
                <span key={months[index]} className={styles.xLabel}>
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.legend}>
        <Legend items={series.map((s, i) => ({ id: s.id, label: s.label, color: colorOf(i) }))} />
      </div>
      {/* The same numbers as a table, for screen readers and anyone who prefers text. */}
      <VisuallyHidden as="div">
        <table id={tableId}>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">Series</th>
              {monthLabels.map((text, index) => (
                <th key={months[index]} scope="col">
                  {text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.id}>
                <th scope="row">{s.label}</th>
                {s.values.map((value, index) => (
                  <td key={months[index] ?? index}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </VisuallyHidden>
    </figure>
  );
}
