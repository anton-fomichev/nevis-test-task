import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import type { ExpandedAction, VisibleRow } from '../../model';

export interface UseTreeGridKeyboardOptions {
  /** The rows currently rendered, in DOM order. */
  rows: readonly VisibleRow[];
  /** Expanded-state dispatcher (expand / collapse / toggle). */
  dispatch: (action: ExpandedAction) => void;
}

export interface TreeGridRowProps {
  ref: (el: HTMLTableRowElement | null) => void;
  tabIndex: 0 | -1;
  onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => void;
  onClick: () => void;
  onFocus: () => void;
}

/**
 * Roving-tabindex keyboard handling for a WAI-ARIA treegrid whose rows are the focusable units
 * (APG "Treegrid" pattern, row-level navigation):
 *
 * - ↑ / ↓  previous / next visible row
 * - →       expand; if already expanded, move to the first child
 * - ←       collapse; if already collapsed (or a leaf), move to the parent
 * - Enter / Space  toggle
 * - Home / End     first / last visible row
 *
 * Exactly one row has `tabIndex=0` (the "active" row); focus follows it after re-renders.
 */
export function useTreeGridKeyboard({ rows, dispatch }: UseTreeGridKeyboardOptions) {
  const firstId = rows[0]?.id ?? null;
  const [activeId, setActiveId] = useState<string | null>(firstId);
  const rowElements = useRef(new Map<string, HTMLTableRowElement>());
  const pendingFocusId = useRef<string | null>(null);

  // If the active row disappeared (its parent was collapsed by the mouse), fall back to the first.
  const effectiveActiveId =
    activeId !== null && rows.some((r) => r.id === activeId) ? activeId : firstId;

  useEffect(() => {
    const id = pendingFocusId.current;
    if (id === null) return;
    pendingFocusId.current = null;
    rowElements.current.get(id)?.focus();
  });

  const moveTo = useCallback((id: string | undefined) => {
    if (id === undefined) return;
    pendingFocusId.current = id;
    setActiveId(id);
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableRowElement>, row: VisibleRow) => {
      if (event.target !== event.currentTarget) return;
      const index = rows.findIndex((r) => r.id === row.id);
      if (index === -1) return;
      let handled = true;

      switch (event.key) {
        case 'ArrowDown':
          moveTo(rows[index + 1]?.id);
          break;
        case 'ArrowUp':
          moveTo(rows[index - 1]?.id);
          break;
        case 'Home':
          moveTo(rows[0]?.id);
          break;
        case 'End':
          moveTo(rows[rows.length - 1]?.id);
          break;
        case 'ArrowRight':
          if (!row.hasChildren) break;
          if (row.expanded)
            moveTo(rows[index + 1]?.id); // first child is the next visible row
          else dispatch({ type: 'expand', id: row.id });
          break;
        case 'ArrowLeft':
          if (row.expanded) dispatch({ type: 'collapse', id: row.id });
          else if (row.parentId !== null) moveTo(row.parentId);
          break;
        case 'Enter':
        case ' ':
          if (row.hasChildren) dispatch({ type: 'toggle', id: row.id });
          break;
        default:
          handled = false;
      }

      if (handled) event.preventDefault();
    },
    [rows, dispatch, moveTo],
  );

  const getRowProps = useCallback(
    (row: VisibleRow): TreeGridRowProps => ({
      ref: (el) => {
        if (el) rowElements.current.set(row.id, el);
        else rowElements.current.delete(row.id);
      },
      tabIndex: row.id === effectiveActiveId ? 0 : -1,
      onKeyDown: (event) => onKeyDown(event, row),
      onClick: () => {
        setActiveId(row.id);
        if (row.hasChildren) dispatch({ type: 'toggle', id: row.id });
      },
      onFocus: () => setActiveId(row.id),
    }),
    [effectiveActiveId, onKeyDown, dispatch],
  );

  return { activeId: effectiveActiveId, getRowProps };
}
