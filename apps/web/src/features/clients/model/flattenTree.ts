import type { TreeNode } from './types';

/** A row of the treegrid as it is currently visible, with everything ARIA needs to describe it. */
export interface VisibleRow {
  id: string;
  node: TreeNode;
  /** 1-based depth; the root is level 1 (`aria-level`). */
  level: number;
  /** 1-based position among its siblings (`aria-posinset`). */
  posInSet: number;
  /** Number of siblings including itself (`aria-setsize`). */
  setSize: number;
  hasChildren: boolean;
  /** Only meaningful when `hasChildren`; `false` for leaves. */
  expanded: boolean;
  parentId: string | null;
}

/**
 * Walks the tree depth-first and returns the rows that are visible given the set of expanded
 * node ids. Children of a collapsed node are not returned at all — the DOM mirrors this so
 * assistive technology never meets hidden rows.
 */
export function flattenTree(root: TreeNode, expanded: ReadonlySet<string>): VisibleRow[] {
  const rows: VisibleRow[] = [];

  const visit = (
    node: TreeNode,
    level: number,
    posInSet: number,
    setSize: number,
    parentId: string | null,
  ) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = hasChildren && expanded.has(node.id);
    rows.push({
      id: node.id,
      node,
      level,
      posInSet,
      setSize,
      hasChildren,
      expanded: isExpanded,
      parentId,
    });
    if (!isExpanded) return;
    node.children.forEach((child, index) =>
      visit(child, level + 1, index + 1, node.children.length, node.id),
    );
  };

  visit(root, 1, 1, 1, null);
  return rows;
}
