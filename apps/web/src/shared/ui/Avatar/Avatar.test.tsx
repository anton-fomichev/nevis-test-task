import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar, hueOf, initialsOf } from './Avatar';

describe('Avatar', () => {
  it('derives initials from first and last word', () => {
    expect(initialsOf('Anna Blackwood')).toBe('AB');
    expect(initialsOf('Maria  Gutierrez ')).toBe('MG');
    expect(initialsOf('Cher')).toBe('C');
    expect(initialsOf('')).toBe('');
  });

  it('picks a stable hue per seed', () => {
    expect(hueOf('abc')).toBe(hueOf('abc'));
    expect(hueOf('abc')).not.toBe(hueOf('abd'));
    expect(hueOf('x')).toBeGreaterThanOrEqual(0);
    expect(hueOf('x')).toBeLessThan(360);
  });

  it('is decorative and shows the initials', () => {
    const { container } = render(<Avatar name="Anna Blackwood" seed="1" />);
    const el = container.firstElementChild!;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).toHaveTextContent('AB');
    expect(el).toHaveStyle({ width: '20px', height: '20px' });
  });
});
