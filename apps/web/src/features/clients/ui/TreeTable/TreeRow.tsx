import { memo } from 'react';

import { cn } from '../../../../shared/lib';
import { Avatar, ChevronIcon } from '../../../../shared/ui';
import type { VisibleRow } from '../../model';
import styles from './TreeTable.module.css';
import type { TreeGridRowProps } from './useTreeGridKeyboard';

export interface TreeRowProps {
  row: VisibleRow;
  /** Focus/keyboard/click wiring from `useTreeGridKeyboard`. */
  rowProps: TreeGridRowProps;
}

/**
 * One treegrid row. Carries the ARIA tree attributes; the whole row is the click/keyboard target.
 * Leaves get no chevron and no `aria-expanded` (DECISIONS #16).
 */
export const TreeRow = memo(function TreeRow({ row, rowProps }: TreeRowProps) {
  const { node, level, posInSet, setSize, hasChildren, expanded } = row;
  const { ref, tabIndex, onKeyDown, onClick, onFocus } = rowProps;

  return (
    <tr
      ref={ref}
      role="row"
      className={cn(styles.row, hasChildren && styles.expandable)}
      aria-level={level}
      aria-posinset={posInSet}
      aria-setsize={setSize}
      {...(hasChildren ? { 'aria-expanded': expanded } : {})}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      onClick={onClick}
      onFocus={onFocus}
      data-kind={node.kind}
    >
      <th scope="row" className={cn(styles.cell, styles.nameCell)}>
        <span className={styles.name} data-kind={node.kind}>
          {node.kind !== 'channel' &&
            (hasChildren ? (
              <ChevronIcon direction={expanded ? 'down' : 'right'} className={styles.chevron} />
            ) : (
              <span className={styles.chevronSpacer} aria-hidden="true" />
            ))}
          {node.kind === 'adviser' && <Avatar name={node.name} seed={node.id} />}
          <span className={styles.nameText} data-name>
            {node.name}
          </span>
        </span>
      </th>
      {node.values.map((value, index) => (
        // Explicit role as in the APG treegrid example: `td` maps to `gridcell` only by context
        // (HTML-AAM), and not every tool applies that mapping (jsdom does not).
        <td key={index} role="gridcell" className={cn(styles.cell, styles.value, 'tnum')}>
          {value}
        </td>
      ))}
    </tr>
  );
});
