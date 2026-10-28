import { describe, expect, it } from 'vitest';

import { devFlagsFrom } from './devFlags';

describe('devFlagsFrom', () => {
  it('forwards only delay and fail', () => {
    expect(devFlagsFrom('?delay=2000&fail=1&utm_source=x')).toBe('?delay=2000&fail=1');
  });
  it('returns an empty string when nothing applies', () => {
    expect(devFlagsFrom('')).toBe('');
    expect(devFlagsFrom('?foo=bar')).toBe('');
    expect(devFlagsFrom('?delay=')).toBe('');
  });
});
