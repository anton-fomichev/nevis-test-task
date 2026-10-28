import { describe, expect, it } from 'vitest';

import { company } from '../../../test/fixtures';
import { flattenTree } from './flattenTree';
import { normaliseCompany } from './types';

const root = normaliseCompany(company);
const ids = {
  company: root.id,
  branch1: root.children[0]!.id,
  anna: root.children[0]!.children[0]!.id,
  branch2: root.children[1]!.id,
};

describe('flattenTree', () => {
  it('returns only the root when nothing is expanded', () => {
    const rows = flattenTree(root, new Set());
    expect(rows.map((r) => r.node.name)).toEqual(['Company']);
    expect(rows[0]).toMatchObject({
      level: 1,
      posInSet: 1,
      setSize: 1,
      hasChildren: true,
      expanded: false,
      parentId: null,
    });
  });

  it('shows the branches when the company is expanded (the initial state)', () => {
    const rows = flattenTree(root, new Set([ids.company]));
    expect(rows.map((r) => r.node.name)).toEqual(['Company', 'Branch 1', 'Branch 2', 'Branch 3']);
    expect(rows[0]!.expanded).toBe(true);
    expect(rows.slice(1).map((r) => [r.level, r.posInSet, r.setSize, r.parentId])).toEqual([
      [2, 1, 3, ids.company],
      [2, 2, 3, ids.company],
      [2, 3, 3, ids.company],
    ]);
  });

  it('marks Branch 2/3 as leaves and Branch 1 as expandable', () => {
    const rows = flattenTree(root, new Set([ids.company]));
    expect(rows.map((r) => r.hasChildren)).toEqual([true, true, false, false]);
  });

  it('walks depth-first down to channels when every ancestor is expanded', () => {
    const rows = flattenTree(root, new Set([ids.company, ids.branch1, ids.anna]));
    expect(rows.map((r) => `${r.level}:${r.node.name}`)).toEqual([
      '1:Company',
      '2:Branch 1',
      '3:Anna Blackwood',
      '4:Existing clients',
      '4:New organic',
      '4:New paid',
      '3:James Walker',
      '3:Maria Gutierrez',
      '3:Robert Chen',
      '3:Sarah Smith',
      '2:Branch 2',
      '2:Branch 3',
    ]);
    const channels = rows.filter((r) => r.level === 4);
    expect(channels.map((r) => [r.posInSet, r.setSize, r.parentId])).toEqual([
      [1, 3, ids.anna],
      [2, 3, ids.anna],
      [3, 3, ids.anna],
    ]);
  });

  it('does not show descendants of a collapsed node even if they are in the expanded set', () => {
    // Anna is "expanded" but Branch 1 is not: her channels must stay hidden (DECISIONS #23).
    const rows = flattenTree(root, new Set([ids.company, ids.anna]));
    expect(rows.map((r) => r.node.name)).toEqual(['Company', 'Branch 1', 'Branch 2', 'Branch 3']);
  });

  it('ignores expanded ids of leaves', () => {
    const rows = flattenTree(root, new Set([ids.company, ids.branch2]));
    expect(rows).toHaveLength(4);
    expect(rows[2]).toMatchObject({ node: { name: 'Branch 2' }, expanded: false });
  });
});
