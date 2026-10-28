import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';

import { report } from '../../../test/fixtures';
import { jsonResponse, mockFetch, pending, serverError } from '../../../test/mockFetch';
import { renderWithQuery } from '../../../test/renderWithQuery';
import { ClientsDashboard } from './ClientsDashboard';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ClientsDashboard', () => {
  it('shows a busy placeholder with a status message while loading', () => {
    mockFetch().mockReturnValue(pending());
    const { container } = renderWithQuery(<ClientsDashboard search="" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading the clients report…');
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(2);
    expect(screen.queryByRole('treegrid')).not.toBeInTheDocument();
  });

  it('renders the chart and the table once the report arrives', async () => {
    const fetch = mockFetch().mockResolvedValue(jsonResponse(report));
    renderWithQuery(<ClientsDashboard search="" />);
    const grid = await screen.findByRole('treegrid');
    expect(grid).toHaveAccessibleName(/branch, adviser and acquisition channel/);
    expect(screen.getByRole('img', { name: /clients per month by branch/i })).toBeInTheDocument();
    expect(within(grid).getByRole('row', { name: /^Company/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![0]).toBe('/api/clients');
  });

  it('shows the server message and a Retry button when the request fails', async () => {
    mockFetch().mockResolvedValue(serverError('Simulated failure requested with ?fail=1'));
    renderWithQuery(<ClientsDashboard search="" />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The clients report could not be loaded.');
    expect(alert).toHaveTextContent(
      'The API answered 500: Simulated failure requested with ?fail=1.',
    );
    expect(within(alert).getByRole('button', { name: 'Retry' })).toBeEnabled();
  });

  it('recovers when Retry succeeds', async () => {
    const user = userEvent.setup();
    const fetch = mockFetch()
      .mockResolvedValueOnce(serverError('boom'))
      .mockResolvedValueOnce(jsonResponse(report));
    renderWithQuery(<ClientsDashboard search="" />);
    await user.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('treegrid')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('explains a network failure', async () => {
    mockFetch().mockRejectedValue(new TypeError('Failed to fetch'));
    renderWithQuery(<ClientsDashboard search="" />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the API (Failed to fetch).',
    );
  });

  it('rejects a payload that does not match the contract instead of rendering garbage', async () => {
    mockFetch().mockResolvedValue(jsonResponse({ months: ['2024-02'], company: { id: 'x' } }));
    renderWithQuery(<ClientsDashboard search="" />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/unexpected shape at company › id/);
  });

  it('forwards the dev flags from the page URL to the API', async () => {
    const fetch = mockFetch().mockResolvedValue(jsonResponse(report));
    renderWithQuery(<ClientsDashboard search="?delay=2000&fail=1&theme=dark" />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch.mock.calls[0]![0]).toBe('/api/clients?delay=2000&fail=1');
  });

  it('drops the dev flags on Retry so ?fail=1 can demonstrate the recovery (DECISIONS #40)', async () => {
    const user = userEvent.setup();
    const fetch = mockFetch()
      .mockResolvedValueOnce(serverError('Simulated failure requested with ?fail=1'))
      .mockResolvedValueOnce(jsonResponse(report));
    renderWithQuery(<ClientsDashboard search="?fail=1" />);
    await user.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('treegrid')).toBeInTheDocument();
    expect(fetch.mock.calls.map((c) => c[0])).toEqual(['/api/clients?fail=1', '/api/clients']);
  });
});
