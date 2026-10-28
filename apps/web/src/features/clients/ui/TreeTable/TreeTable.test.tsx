import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { company, MONTHS } from '../../../../test/fixtures';
import { normaliseCompany } from '../../model';
import { TreeTable } from './TreeTable';

const root = normaliseCompany(company);

function setup(defaultExpanded?: ReadonlySet<string>) {
  const user = userEvent.setup();
  render(
    <TreeTable
      root={root}
      months={MONTHS}
      label="Clients by branch"
      {...(defaultExpanded ? { defaultExpanded } : {})}
    />,
  );
  return { user };
}

const rowNames = () =>
  screen
    .getAllByRole('row')
    .slice(1) // skip the header row
    .map((row) => row.querySelector('[data-name]')!.textContent);

const row = (name: string) => screen.getByRole('row', { name: new RegExp(`^${name}`) });

describe('TreeTable — structure and ARIA', () => {
  it('is a labelled treegrid with a hidden "Name" header and formatted month headers', () => {
    setup();
    expect(screen.getByRole('treegrid', { name: 'Clients by branch' })).toBeInTheDocument();
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual([
      'Name',
      'Feb 2024',
      'Mar 2024',
      'Apr 2024',
      'May 2024',
      'Jun 2024',
      'Jul 2024',
      'Aug 2024',
      'Sep 2024',
      'Oct 2024',
      'Nov 2024',
      'Dec 2024',
      'Jan 2025',
    ]);
  });

  it('starts with the company expanded and the branches collapsed', () => {
    setup();
    expect(rowNames()).toEqual(['Company', 'Branch 1', 'Branch 2', 'Branch 3']);
    expect(row('Company')).toHaveAttribute('aria-expanded', 'true');
    expect(row('Branch 1')).toHaveAttribute('aria-expanded', 'false');
  });

  it('exposes level / position / set size on every row', () => {
    setup();
    expect(row('Company')).toHaveAttribute('aria-level', '1');
    expect(row('Company')).toHaveAttribute('aria-posinset', '1');
    expect(row('Company')).toHaveAttribute('aria-setsize', '1');
    expect(row('Branch 2')).toHaveAttribute('aria-level', '2');
    expect(row('Branch 2')).toHaveAttribute('aria-posinset', '2');
    expect(row('Branch 2')).toHaveAttribute('aria-setsize', '3');
  });

  it('gives leaf rows no aria-expanded and no chevron (DECISIONS #16)', () => {
    setup();
    for (const name of ['Branch 2', 'Branch 3']) {
      expect(row(name)).not.toHaveAttribute('aria-expanded');
      expect(row(name).querySelector('[data-chevron]')).toBeNull();
    }
    expect(row('Branch 1').querySelector('[data-chevron]')).toHaveAttribute(
      'data-chevron',
      'right',
    );
    expect(row('Company').querySelector('[data-chevron]')).toHaveAttribute('data-chevron', 'down');
  });

  it('renders the values of each row as served', () => {
    setup();
    const cells = within(row('Company'))
      .getAllByRole('gridcell')
      .map((c) => c.textContent);
    expect(cells).toEqual([
      '250',
      '267',
      '284',
      '301',
      '317',
      '334',
      '350',
      '250',
      '250',
      '250',
      '250',
      '350',
    ]);
  });

  it('shows an initials avatar for advisers only', () => {
    setup(new Set([root.id, root.children[0]!.id]));
    expect(row('Anna Blackwood').querySelector('[data-avatar]')).toHaveTextContent('AB');
    expect(row('Branch 1').querySelector('[data-avatar]')).toBeNull();
  });
});

describe('TreeTable — mouse', () => {
  it('expands and collapses on click, removing children from the DOM when collapsed', async () => {
    const { user } = setup();
    await user.click(row('Branch 1'));
    expect(row('Branch 1')).toHaveAttribute('aria-expanded', 'true');
    expect(rowNames()).toEqual([
      'Company',
      'Branch 1',
      'Anna Blackwood',
      'James Walker',
      'Maria Gutierrez',
      'Robert Chen',
      'Sarah Smith',
      'Branch 2',
      'Branch 3',
    ]);
    expect(row('Anna Blackwood')).toHaveAttribute('aria-level', '3');
    expect(row('Anna Blackwood')).toHaveAttribute('aria-setsize', '5');

    await user.click(row('Branch 1'));
    expect(row('Branch 1')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('row', { name: /Anna Blackwood/ })).not.toBeInTheDocument();
    expect(rowNames()).toHaveLength(4);
  });

  it('does nothing when a leaf row is clicked', async () => {
    const { user } = setup();
    await user.click(row('Branch 2'));
    expect(rowNames()).toHaveLength(4);
  });

  it('drills down to channels (only Anna has them)', async () => {
    const { user } = setup();
    await user.click(row('Branch 1'));
    await user.click(row('Anna Blackwood'));
    expect(rowNames().slice(2, 6)).toEqual([
      'Anna Blackwood',
      'Existing clients',
      'New organic',
      'New paid',
    ]);
    expect(row('New paid')).toHaveAttribute('aria-level', '4');
    expect(row('New paid')).not.toHaveAttribute('aria-expanded');
    expect(row('New paid').querySelector('[data-chevron]')).toBeNull();
    // James has no channels: not expandable.
    expect(row('James Walker')).not.toHaveAttribute('aria-expanded');
  });

  it('keeps descendants expanded across a collapse/expand of their parent (DECISIONS #23)', async () => {
    const { user } = setup();
    await user.click(row('Branch 1'));
    await user.click(row('Anna Blackwood'));
    await user.click(row('Branch 1'));
    expect(rowNames()).toHaveLength(4);
    await user.click(row('Branch 1'));
    expect(screen.getByRole('row', { name: /^Existing clients/ })).toBeInTheDocument();
  });
});

describe('TreeTable — keyboard', () => {
  it('uses a roving tabindex: Tab lands on the company row only', async () => {
    const { user } = setup();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.filter((r) => r.getAttribute('tabindex') === '0')).toEqual([row('Company')]);
    await user.tab();
    expect(row('Company')).toHaveFocus();
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it('moves with ArrowDown / ArrowUp / Home / End', async () => {
    const { user } = setup();
    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(row('Branch 1')).toHaveFocus();
    expect(row('Branch 1')).toHaveAttribute('tabindex', '0');
    expect(row('Company')).toHaveAttribute('tabindex', '-1');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(row('Branch 3')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(row('Branch 3')).toHaveFocus(); // stays on the last row
    await user.keyboard('{ArrowUp}');
    expect(row('Branch 2')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(row('Company')).toHaveFocus();
    await user.keyboard('{End}');
    expect(row('Branch 3')).toHaveFocus();
  });

  it('ArrowRight expands, then moves to the first child; ArrowLeft collapses, then moves to the parent', async () => {
    const { user } = setup();
    await user.tab();
    await user.keyboard('{ArrowDown}'); // Branch 1
    await user.keyboard('{ArrowRight}');
    expect(row('Branch 1')).toHaveAttribute('aria-expanded', 'true');
    expect(row('Branch 1')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(row('Anna Blackwood')).toHaveFocus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(row('Existing clients')).toHaveFocus();
    await user.keyboard('{ArrowRight}'); // leaf: no-op
    expect(row('Existing clients')).toHaveFocus();

    await user.keyboard('{ArrowLeft}'); // leaf → parent
    expect(row('Anna Blackwood')).toHaveFocus();
    await user.keyboard('{ArrowLeft}'); // expanded → collapse
    expect(row('Anna Blackwood')).toHaveAttribute('aria-expanded', 'false');
    expect(row('Anna Blackwood')).toHaveFocus();
    expect(screen.queryByRole('row', { name: /^Existing clients/ })).not.toBeInTheDocument();
    await user.keyboard('{ArrowLeft}'); // collapsed → parent
    expect(row('Branch 1')).toHaveFocus();
  });

  it('ArrowLeft on the collapsed root does nothing', async () => {
    const { user } = setup(new Set());
    await user.tab();
    await user.keyboard('{ArrowLeft}');
    expect(row('Company')).toHaveFocus();
    expect(rowNames()).toEqual(['Company']);
  });

  it('Enter and Space toggle; neither does anything on a leaf', async () => {
    const { user } = setup();
    await user.tab();
    await user.keyboard('{ArrowDown}'); // Branch 1
    await user.keyboard('{Enter}');
    expect(row('Branch 1')).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard(' ');
    expect(row('Branch 1')).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{ArrowDown}'); // Branch 2 (leaf)
    await user.keyboard('{Enter} ');
    expect(rowNames()).toHaveLength(4);
    expect(row('Branch 2')).toHaveFocus();
  });

  it('clicking a row makes it the tab stop', async () => {
    const { user } = setup();
    await user.click(row('Branch 3'));
    expect(row('Branch 3')).toHaveAttribute('tabindex', '0');
    expect(row('Company')).toHaveAttribute('tabindex', '-1');
  });

  it('keeps exactly one tab stop when the active row is collapsed away', async () => {
    const { user } = setup();
    await user.click(row('Branch 1'));
    await user.click(row('Sarah Smith'));
    expect(row('Sarah Smith')).toHaveAttribute('tabindex', '0');
    await user.click(row('Branch 1')); // Sarah disappears; the clicked parent becomes the stop
    const stops = screen.getAllByRole('row').filter((r) => r.getAttribute('tabindex') === '0');
    expect(stops).toEqual([row('Branch 1')]);
  });
});
