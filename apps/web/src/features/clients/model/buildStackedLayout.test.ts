import { describe, expect, it } from 'vitest';

import { company, MONTHS } from '../../../test/fixtures';
import { buildStackedLayout } from './buildStackedLayout';
import { toChartSeries } from './toChartSeries';
import { normaliseCompany } from './types';

const twoMonths = ['2024-02', '2024-03'];
const fixed = [
  { id: 'a', label: 'A', values: [100, 50] },
  { id: 'b', label: 'B', values: [200, 0] },
  { id: 'c', label: 'C', values: [50, 25] },
];

describe('buildStackedLayout', () => {
  it('maps values to pixel heights against a nice max (height 320, max 400 → 0.8 px per unit)', () => {
    const layout = buildStackedLayout(fixed, twoMonths, { height: 320, tickCount: 5 });
    expect(layout.max).toBe(400); // ceil(350 / 100) * 100
    expect(layout.scale(100)).toBe(80);

    const feb = layout.columns[0]!;
    expect(feb.total).toBe(350);
    expect(feb.height).toBe(280);
    expect(feb.top).toBe(40);
    // bottom → top: A (100), B (200), C (50)
    expect(feb.segments).toEqual([
      { seriesId: 'a', value: 100, y: 240, height: 80 },
      { seriesId: 'b', value: 200, y: 80, height: 160 },
      { seriesId: 'c', value: 50, y: 40, height: 40 },
    ]);
  });

  it('keeps a zero-height segment so every column has one segment per series', () => {
    const layout = buildStackedLayout(fixed, twoMonths);
    const mar = layout.columns[1]!;
    expect(mar.segments).toHaveLength(3);
    expect(mar.segments[1]).toEqual({ seriesId: 'b', value: 0, y: 320 - 40, height: 0 });
    expect(mar.total).toBe(75);
  });

  it('produces evenly spaced ticks from 0 to max', () => {
    const layout = buildStackedLayout(fixed, twoMonths, { tickCount: 5 });
    expect(layout.ticks.map((t) => t.value)).toEqual([0, 100, 200, 300, 400]);
    expect(layout.ticks.map((t) => t.y)).toEqual([320, 240, 160, 80, 0]);
  });

  it("reproduces the design's 0…400 axis for the brief's data", () => {
    const layout = buildStackedLayout(toChartSeries(normaliseCompany(company)), MONTHS);
    expect(layout.max).toBe(400);
    expect(layout.columns).toHaveLength(12);
    expect(layout.columns.every((c) => c.segments.length === 3)).toBe(true);
    // Company totals are the branch sums (not the company's own values — DECISIONS #18).
    expect(layout.columns.map((c) => c.total)).toEqual([
      250, 267, 284, 279, 317, 334, 350, 250, 250, 250, 250, 350,
    ]);
    expect(layout.columns[6]!.height).toBe(280); // 350 of 400 → 87.5% of 320
  });

  it('never produces a degenerate axis for all-zero data', () => {
    const layout = buildStackedLayout([{ id: 'z', label: 'Z', values: [0, 0] }], twoMonths);
    expect(layout.max).toBe(100);
    expect(layout.columns[0]!.height).toBe(0);
    expect(Number.isFinite(layout.scale(0))).toBe(true);
  });

  it('treats a missing value as 0 rather than NaN', () => {
    const layout = buildStackedLayout([{ id: 'a', label: 'A', values: [10] }], twoMonths);
    expect(layout.columns[1]!.total).toBe(0);
    expect(layout.columns[1]!.segments[0]!.height).toBe(0);
  });

  it('rejects impossible options', () => {
    expect(() => buildStackedLayout(fixed, twoMonths, { height: 0 })).toThrow(RangeError);
    expect(() => buildStackedLayout(fixed, twoMonths, { tickCount: 1 })).toThrow(RangeError);
    expect(() => buildStackedLayout(fixed, twoMonths, { niceStep: 0 })).toThrow(RangeError);
  });
});
