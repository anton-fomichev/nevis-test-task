import { clientsReportSchema, type ClientsReport } from '@nevis/contracts';

import clients from './clients.json' with { type: 'json' };
import { MONTHS } from './months.js';

/**
 * Builds the report served by `GET /api/clients` and validates it against the shared contract.
 * Called once at startup: a payload whose values do not line up with the months fails fast with a
 * readable error instead of rendering a misaligned table.
 */
export function loadClientsReport(): ClientsReport {
  const result = clientsReportSchema.safeParse({ months: MONTHS, company: clients });
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join(' › ')}: ${issue.message}`)
      .join('\n');
    throw new Error(`clients.json does not satisfy the clients report contract:\n${details}`);
  }
  return result.data;
}
