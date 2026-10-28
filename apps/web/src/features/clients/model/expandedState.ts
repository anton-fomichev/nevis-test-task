/**
 * Expanded-row state of the treegrid: the set of node ids whose children are shown.
 * Collapsing a parent does not prune its descendants from the set, so re-expanding restores the
 * previous view (DECISIONS #23).
 */
export type ExpandedState = ReadonlySet<string>;

export type ExpandedAction =
  | { type: 'toggle'; id: string }
  | { type: 'expand'; id: string }
  | { type: 'collapse'; id: string };

export function expandedReducer(state: ExpandedState, action: ExpandedAction): ExpandedState {
  const has = state.has(action.id);
  const shouldHave =
    action.type === 'toggle' ? !has : action.type === 'expand' ? true : (false as boolean);
  if (shouldHave === has) return state;
  const next = new Set(state);
  if (shouldHave) next.add(action.id);
  else next.delete(action.id);
  return next;
}

/** The initial state the design shows: only the root is expanded. */
export function initialExpanded(rootId: string): ExpandedState {
  return new Set([rootId]);
}
