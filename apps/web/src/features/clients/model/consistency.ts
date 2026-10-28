import type { TreeNode } from './types';

/** A month where a node's own figure differs from the sum of its children's figures. */
export interface Mismatch {
  name: string;
  monthIndex: number;
  value: number;
  childrenSum: number;
}

/**
 * Lists every (node, month) where the node's value is not the sum of its children. The payload in
 * the brief has several (DECISIONS #18); the UI shows the figures as served and never recomputes
 * them, so this is a diagnostic, not a correction.
 */
export function findMismatches(root: TreeNode): Mismatch[] {
  const out: Mismatch[] = [];
  const visit = (node: TreeNode) => {
    if (node.children.length === 0) return;
    node.values.forEach((value, monthIndex) => {
      const childrenSum = node.children.reduce((sum, c) => sum + (c.values[monthIndex] ?? 0), 0);
      if (childrenSum !== value) out.push({ name: node.name, monthIndex, value, childrenSum });
    });
    node.children.forEach(visit);
  };
  visit(root);
  return out;
}
