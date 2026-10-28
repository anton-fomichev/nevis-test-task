import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  clientsReportSchema,
  companyNodeSchema,
  walkCompany,
  type CompanyNode,
} from './clients.js';

// The payload lives with the API (it is what the API serves). The contracts package only
// reads it here, in a test, to prove the schema accepts the brief's data as-is.
const payloadUrl = new URL('../../../apps/api/src/data/clients.json', import.meta.url);
const payload = JSON.parse(readFileSync(fileURLToPath(payloadUrl), 'utf8')) as unknown;

const months = [
  '2024-02',
  '2024-03',
  '2024-04',
  '2024-05',
  '2024-06',
  '2024-07',
  '2024-08',
  '2024-09',
  '2024-10',
  '2024-11',
  '2024-12',
  '2025-01',
];

describe('companyNodeSchema', () => {
  it("parses the brief's payload without changing it", () => {
    const parsed = companyNodeSchema.parse(payload);
    expect(parsed).toEqual(payload);
  });

  it('accepts the non-uniform nesting of the brief', () => {
    const company = companyNodeSchema.parse(payload);
    const [branch1, branch2, branch3] = company.branches ?? [];
    expect(branch1?.employees).toHaveLength(5);
    expect(branch2?.employees).toBeUndefined();
    expect(branch3?.employees).toBeUndefined();
    const withChannels = branch1?.employees?.filter((e) => e.channels) ?? [];
    expect(withChannels.map((e) => e.name)).toEqual(['Anna Blackwood']);
  });

  it('rejects malformed nodes', () => {
    expect(companyNodeSchema.safeParse({ id: 'not-a-uuid', name: 'X', values: [] }).success).toBe(
      false,
    );
    expect(
      companyNodeSchema.safeParse({
        id: 'd6e00056-dce4-4ef4-b034-d6467db6187d',
        name: 'X',
        values: [1, -2],
      }).success,
    ).toBe(false);
    expect(
      companyNodeSchema.safeParse({
        id: 'd6e00056-dce4-4ef4-b034-d6467db6187d',
        name: '',
        values: [1],
      }).success,
    ).toBe(false);
  });
});

describe('clientsReportSchema', () => {
  it('parses months + company', () => {
    const report = clientsReportSchema.parse({ months, company: payload });
    expect(report.months).toHaveLength(12);
    expect(report.company.name).toBe('Company');
  });

  it('rejects months that are not YYYY-MM', () => {
    const result = clientsReportSchema.safeParse({ months: ['Feb 2024'], company: payload });
    expect(result.success).toBe(false);
  });

  it('rejects a node whose values do not line up with the months', () => {
    const company = companyNodeSchema.parse(payload);
    const broken: CompanyNode = {
      ...company,
      branches: company.branches?.map((b, i) =>
        i === 1 ? { ...b, values: b.values.slice(0, 11) } : b,
      ),
    };
    const result = clientsReportSchema.safeParse({ months, company: broken });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues[0];
      expect(issue?.message).toContain('"Branch 2" has 11 values but there are 12 months');
      expect(issue?.path).toEqual(['company', 'Company', 'Branch 2']);
    }
  });
});

describe('walkCompany', () => {
  it('visits every node depth-first, parents first', () => {
    const company = companyNodeSchema.parse(payload);
    const names = [...walkCompany(company)].map(({ node }) => node.name);
    expect(names).toEqual([
      'Company',
      'Branch 1',
      'Anna Blackwood',
      'Existing clients',
      'New organic',
      'New paid',
      'James Walker',
      'Maria Gutierrez',
      'Robert Chen',
      'Sarah Smith',
      'Branch 2',
      'Branch 3',
    ]);
  });
});
