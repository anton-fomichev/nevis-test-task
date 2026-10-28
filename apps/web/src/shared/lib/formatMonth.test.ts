import { describe, expect, it } from 'vitest';

import { formatMonth } from './formatMonth';

describe('formatMonth', () => {
  it('formats ISO months as the design shows them', () => {
    expect(formatMonth('2024-02')).toBe('Feb 2024');
    expect(formatMonth('2024-09')).toBe('Sep 2024');
    expect(formatMonth('2025-01')).toBe('Jan 2025');
  });

  it('rejects malformed input', () => {
    expect(() => formatMonth('Feb 2024')).toThrow(RangeError);
    expect(() => formatMonth('2024-13')).toThrow(RangeError);
  });
});
