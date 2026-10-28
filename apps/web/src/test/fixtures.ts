import type { ClientsReport, CompanyNode } from '@nevis/contracts';

// Test-only, one-directional coupling to the API's data file: the tests below assert facts about
// *this* payload (e.g. the parent/child mismatches), so a copy would only drift. See DEVLOG step 5.
import clients from '../../../api/src/data/clients.json';

export const MONTHS = [
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
] as const;

export const company: CompanyNode = clients;

export const report: ClientsReport = { months: [...MONTHS], company };
