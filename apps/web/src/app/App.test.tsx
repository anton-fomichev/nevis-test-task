import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockFetch, pending } from '../test/mockFetch';
import { App } from './App';

afterEach(() => vi.unstubAllGlobals());

describe('App', () => {
  it('renders the page title and starts loading the report', () => {
    mockFetch().mockReturnValue(pending());
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Clients' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
