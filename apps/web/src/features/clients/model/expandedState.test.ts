import { describe, expect, it } from 'vitest';

import { expandedReducer, initialExpanded } from './expandedState';

describe('expandedReducer', () => {
  it('starts with only the root expanded', () => {
    expect([...initialExpanded('root')]).toEqual(['root']);
  });

  it('toggles ids in and out', () => {
    const a = expandedReducer(new Set(), { type: 'toggle', id: 'x' });
    expect(a.has('x')).toBe(true);
    const b = expandedReducer(a, { type: 'toggle', id: 'x' });
    expect(b.has('x')).toBe(false);
  });

  it('expand/collapse are idempotent and return the same state when nothing changes', () => {
    const s = new Set(['x']);
    expect(expandedReducer(s, { type: 'expand', id: 'x' })).toBe(s);
    expect(expandedReducer(s, { type: 'collapse', id: 'y' })).toBe(s);
    expect(expandedReducer(s, { type: 'collapse', id: 'x' }).has('x')).toBe(false);
  });

  it('never mutates the previous state', () => {
    const s = new Set(['x']);
    expandedReducer(s, { type: 'expand', id: 'y' });
    expect([...s]).toEqual(['x']);
  });
});
