import type { TreeNode } from './types';

/** One stacked series of the chart. Deliberately knows nothing about the tree. */
export interface ChartSeries {
  id: string;
  label: string;
  values: readonly number[];
}

/**
 * The chart stacks a node by its children (DECISIONS #17): for the company that is one series per
 * branch. A node without children becomes a single series of itself, so the chart never goes
 * empty for a leaf.
 */
export function toChartSeries(node: TreeNode): ChartSeries[] {
  if (node.children.length === 0) {
    return [{ id: node.id, label: node.name, values: node.values }];
  }
  return node.children.map((child) => ({ id: child.id, label: child.name, values: child.values }));
}
