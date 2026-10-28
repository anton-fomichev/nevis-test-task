import { useMemo, useReducer } from 'react';

import { formatMonth as defaultFormatMonth } from '../../../../shared/lib';
import { VisuallyHidden } from '../../../../shared/ui';
import {
  expandedReducer,
  flattenTree,
  initialExpanded,
  type ExpandedState,
  type TreeNode,
} from '../../model';
import { TreeRow } from './TreeRow';
import styles from './TreeTable.module.css';
import { useTreeGridKeyboard } from './useTreeGridKeyboard';

export interface TreeTableProps {
  /** Root of the hierarchy (the company). */
  root: TreeNode;
  /** ISO months (`YYYY-MM`) for the value columns, in order. */
  months: readonly string[];
  /** Accessible name of the grid. */
  label: string;
  /** Ids expanded on first render. Default: only the root. */
  defaultExpanded?: ExpandedState | undefined;
  /** Column header formatter. Default: `"2024-02"` → `"Feb 2024"`. */
  formatMonth?: ((isoMonth: string) => string) | undefined;
}

/**
 * Hierarchical table (WAI-ARIA treegrid) of the clients tree. Owns its expanded state; the rows
 * are the focusable units (see `useTreeGridKeyboard`). Children of collapsed rows are not
 * rendered. Scrolls horizontally inside its card and keeps the name column sticky.
 */
export function TreeTable({
  root,
  months,
  label,
  defaultExpanded,
  formatMonth = defaultFormatMonth,
}: TreeTableProps) {
  const [expanded, dispatch] = useReducer(
    expandedReducer,
    defaultExpanded ?? initialExpanded(root.id),
  );
  const rows = useMemo(() => flattenTree(root, expanded), [root, expanded]);
  const { getRowProps } = useTreeGridKeyboard({ rows, dispatch });

  return (
    <div className={styles.scroller}>
      {/* A table whose rows expand *is* the WAI-ARIA treegrid pattern (DECISIONS #11); jsx-a11y
          only knows that `table` is static and `treegrid` is a widget. */}
      {/* eslint-disable jsx-a11y/no-noninteractive-element-to-interactive-role */}
      <table
        role="treegrid"
        aria-label={label}
        className={styles.table}
        style={{ '--month-count': months.length } as React.CSSProperties}
      >
        {/* eslint-enable jsx-a11y/no-noninteractive-element-to-interactive-role */}
        <colgroup>
          <col className={styles.nameCol} />
          {months.map((month) => (
            <col key={month} />
          ))}
        </colgroup>
        <thead>
          <tr role="row" className={styles.headerRow}>
            <th scope="col" className={`${styles.cell} ${styles.nameCell}`}>
              <VisuallyHidden>Name</VisuallyHidden>
            </th>
            {months.map((month) => (
              <th
                key={month}
                scope="col"

                className={`${styles.cell} ${styles.value} ${styles.monthHeader}`}
              >
                {formatMonth(month)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TreeRow key={row.id} row={row} rowProps={getRowProps(row)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
