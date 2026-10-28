import { describe, expect, it } from 'vitest';

import { company } from '../../../test/fixtures';
import { normaliseCompany } from './types';

describe('normaliseCompany', () => {
  const root = normaliseCompany(company);

  it('maps the three child keys onto one `children` array with a kind per level', () => {
    expect(root.kind).toBe('company');
    expect(root.children.map((c) => c.kind)).toEqual(['branch', 'branch', 'branch']);
    const branch1 = root.children[0]!;
    expect(branch1.children.map((c) => c.kind)).toEqual(Array(5).fill('adviser'));
    const anna = branch1.children[0]!;
    expect(anna.children.map((c) => c.kind)).toEqual(['channel', 'channel', 'channel']);
  });

  it('handles the non-uniform nesting: Branch 2/3 are leaves, only Anna has channels', () => {
    const [, branch2, branch3] = root.children;
    expect(branch2?.children).toEqual([]);
    expect(branch3?.children).toEqual([]);
    const advisers = root.children[0]!.children;
    expect(advisers.filter((a) => a.children.length > 0).map((a) => a.name)).toEqual([
      'Anna Blackwood',
    ]);
  });

  it('keeps ids, names and values exactly as served', () => {
    expect(root.id).toBe(company.id);
    expect(root.values).toBe(company.values);
    expect(root.children[2]!.name).toBe('Branch 3');
    expect(root.children[2]!.values).toEqual([27, 30, 34, 36, 39, 41, 42, 28, 28, 28, 28, 45]);
  });
});
