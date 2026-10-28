import { describe, expect, it } from 'vitest';

import { company, MONTHS } from '../../../test/fixtures';
import { findMismatches } from './consistency';
import { normaliseCompany } from './types';

/**
 * Documents DECISIONS #18: the brief's payload has parents whose figures are not the sum of their
 * children. The UI shows values as served. If the data is ever corrected this test should be
 * updated (or deleted) deliberately, not silently.
 */
describe('findMismatches on the brief payload', () => {
  const mismatches = findMismatches(normaliseCompany(company));
  const describeMonth = (i: number) => MONTHS[i];

  it('finds exactly the known parent/children differences', () => {
    expect(
      mismatches.map(
        (m) => `${m.name} ${describeMonth(m.monthIndex)}: ${m.value} vs ${m.childrenSum}`,
      ),
    ).toEqual([
      'Company 2024-05: 301 vs 279',
      'Branch 1 2024-08: 214 vs 216',
      'Anna Blackwood 2024-05: 31 vs 30',
      'Anna Blackwood 2024-06: 32 vs 33',
      'Anna Blackwood 2024-07: 34 vs 35',
      'Anna Blackwood 2024-08: 38 vs 36',
      'Anna Blackwood 2024-09: 27 vs 28',
    ]);
  });

  it('the May 2024 gap at company level equals the gap a Maria Gutierrez typo would explain', () => {
    // Maria's May 2024 figure is 22 between 41 and 46; with 44 the company total would reconcile.
    const companyMay = mismatches.find((m) => m.name === 'Company')!;
    expect(companyMay.value - companyMay.childrenSum).toBe(22);
    const maria = company.branches![0]!.employees!.find((e) => e.name === 'Maria Gutierrez')!;
    expect(maria.values[3]).toBe(22);
    expect(44 - maria.values[3]!).toBe(22);
  });

  it('returns nothing for a consistent tree', () => {
    const root = normaliseCompany({
      id: 'd6e00056-dce4-4ef4-b034-d6467db6187d',
      name: 'C',
      values: [3],
      branches: [
        { id: 'd6b668e1-89a4-4467-bdf6-c9ebaf2cea5f', name: 'B1', values: [1] },
        { id: '71da0b06-5785-4a60-9273-4df2be619ee4', name: 'B2', values: [2] },
      ],
    });
    expect(findMismatches(root)).toEqual([]);
  });
});
