import { describe, expect, it } from 'vitest';

import { company } from '../../../test/fixtures';
import { toChartSeries } from './toChartSeries';
import { normaliseCompany } from './types';

describe('toChartSeries', () => {
  const root = normaliseCompany(company);

  it('stacks the company by its branches (DECISIONS #17)', () => {
    const series = toChartSeries(root);
    expect(series.map((s) => s.label)).toEqual(['Branch 1', 'Branch 2', 'Branch 3']);
    expect(series.map((s) => s.id)).toEqual(root.children.map((c) => c.id));
    expect(series[1]!.values).toEqual([76, 80, 84, 87, 90, 92, 94, 75, 75, 75, 75, 91]);
  });

  it('falls back to the node itself for a leaf', () => {
    const branch2 = root.children[1]!;
    expect(toChartSeries(branch2)).toEqual([
      { id: branch2.id, label: 'Branch 2', values: branch2.values },
    ]);
  });
});
