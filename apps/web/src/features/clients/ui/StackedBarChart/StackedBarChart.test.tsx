import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { company, MONTHS } from '../../../../test/fixtures';
import { normaliseCompany, toChartSeries } from '../../model';
import { seriesColor } from './palette';
import { StackedBarChart } from './StackedBarChart';

const twoMonths = ['2024-02', '2024-03'];
const fixed = [
  { id: 'a', label: 'Alpha', values: [100, 50] },
  { id: 'b', label: 'Beta', values: [200, 0] },
  { id: 'c', label: 'Gamma', values: [50, 25] },
];

const columns = (container: HTMLElement) => [...container.querySelectorAll('[data-column]')];
const rects = (column: Element) => [...column.querySelectorAll('rect')];

describe('StackedBarChart — data → drawing', () => {
  it('draws one column per month and one segment per series, bottom to top', () => {
    const { container } = render(
      <StackedBarChart series={fixed} months={twoMonths} label="Test chart" />,
    );
    const cols = columns(container);
    expect(cols).toHaveLength(2);
    expect(rects(cols[0]!).map((r) => r.getAttribute('data-series'))).toEqual(['a', 'b', 'c']);
  });

  it('maps values to exact pixel heights (320px plot, max 400 → 0.8px per unit)', () => {
    const { container } = render(
      <StackedBarChart series={fixed} months={twoMonths} label="Test chart" height={320} />,
    );
    const [feb, mar] = columns(container);
    const febStack = feb!.firstElementChild as HTMLElement;
    expect(febStack).toHaveStyle({ height: '280px' }); // 350 of 400
    expect(rects(feb!).map((r) => [r.getAttribute('y'), r.getAttribute('height')])).toEqual([
      ['200', '80'], // Alpha 100 at the bottom of a 280px stack
      ['40', '160'], // Beta 200
      ['0', '40'], // Gamma 50 at the top
    ]);
    const marStack = mar!.firstElementChild as HTMLElement;
    expect(marStack).toHaveStyle({ height: '60px' }); // 75 of 400
    expect(rects(mar!)[1]).toHaveAttribute('height', '0'); // Beta is 0 in March
  });

  it('colours segments by series index with the design tokens', () => {
    const { container } = render(
      <StackedBarChart series={fixed} months={twoMonths} label="Test chart" />,
    );
    const fills = rects(columns(container)[0]!).map((r) => (r as SVGRectElement).style.fill);
    expect(fills).toEqual(['var(--series-1)', 'var(--series-2)', 'var(--series-3)']);
  });

  it('renders y ticks and x labels from the layout', () => {
    const { container } = render(
      <StackedBarChart series={fixed} months={twoMonths} label="Test chart" />,
    );
    const img = container.querySelector('[role="img"]')!;
    expect(img.textContent).toContain('0100200300400');
    expect(img.textContent).toContain('Feb 2024');
    expect(img.textContent).toContain('Mar 2024');
    expect(container.querySelectorAll('line')).toHaveLength(5);
  });

  it("stacks the brief's company by branch: 12 columns × 3 segments", () => {
    const series = toChartSeries(normaliseCompany(company));
    const { container } = render(
      <StackedBarChart series={series} months={MONTHS} label="Clients per month by branch" />,
    );
    const cols = columns(container);
    expect(cols).toHaveLength(12);
    expect(cols.every((c) => rects(c).length === 3)).toBe(true);
    // Aug 2024: branches 214 + 94 + 42 = 350 → 280px of 320
    expect(cols[6]!.firstElementChild).toHaveStyle({ height: '280px' });
    expect(rects(cols[6]!).map((r) => r.getAttribute('data-value'))).toEqual(['214', '94', '42']);
  });
});

describe('StackedBarChart — accessibility', () => {
  it('exposes the drawing as one image with the given label', () => {
    render(<StackedBarChart series={fixed} months={twoMonths} label="Clients per month" />);
    expect(screen.getByRole('img', { name: 'Clients per month' })).toBeInTheDocument();
  });

  it('provides the same numbers in a (visually hidden) table', () => {
    render(<StackedBarChart series={fixed} months={twoMonths} label="Clients per month" />);
    const table = screen.getByRole('table', { name: 'Clients per month' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Series', 'Feb 2024', 'Mar 2024']);
    const beta = within(table).getByRole('row', { name: /Beta/ });
    expect(
      within(beta)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['200', '0']);
  });

  it('shows a legend with one swatch + label per series', () => {
    render(<StackedBarChart series={fixed} months={twoMonths} label="Clients per month" />);
    const legend = screen.getByRole('list', { name: 'Legend' });
    const items = within(legend).getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(items[2]!.querySelector('span')).toHaveStyle({ background: 'var(--series-3)' });
  });
});

describe('seriesColor', () => {
  it('uses the three tokens, then a stable generated hue', () => {
    expect([0, 1, 2].map((i) => seriesColor(i))).toEqual([
      'var(--series-1)',
      'var(--series-2)',
      'var(--series-3)',
    ]);
    expect(seriesColor(3)).toMatch(/^hsl\(\d+ 50% 70%\)$/);
    expect(seriesColor(3)).toBe(seriesColor(3));
    expect(seriesColor(3)).not.toBe(seriesColor(4));
  });
});
