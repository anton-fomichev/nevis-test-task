import { z } from 'zod';

/**
 * A single node in the clients tree. Every level of the hierarchy shares this shape;
 * the child key differs per level (`branches` → `employees` → `channels`), which is why the
 * levels are modelled as separate schemas rather than one recursive schema.
 */
const baseNodeSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  /** Twelve monthly figures in the order of `ClientsReport.months`. */
  values: z.array(z.number().int().nonnegative()),
});

/** Acquisition channel — a leaf. */
export const channelNodeSchema = baseNodeSchema;

/** Adviser (the brief calls them employees). May own acquisition channels. */
export const employeeNodeSchema = baseNodeSchema.extend({
  channels: z.array(channelNodeSchema).optional(),
});

/** Branch. May own employees. */
export const branchNodeSchema = baseNodeSchema.extend({
  employees: z.array(employeeNodeSchema).optional(),
});

/** Company — the root of the payload served by `GET /api/clients`. */
export const companyNodeSchema = baseNodeSchema.extend({
  branches: z.array(branchNodeSchema).optional(),
});

/** ISO month, e.g. `"2024-02"`. */
export const isoMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'expected YYYY-MM');

export type ChannelNode = z.infer<typeof channelNodeSchema>;
export type EmployeeNode = z.infer<typeof employeeNodeSchema>;
export type BranchNode = z.infer<typeof branchNodeSchema>;
export type CompanyNode = z.infer<typeof companyNodeSchema>;
export type IsoMonth = z.infer<typeof isoMonthSchema>;

/** Walks every node of the tree, depth first, parents before children. */
export function* walkCompany(
  company: CompanyNode,
): Generator<{ node: ChannelNode; path: string[] }, void, undefined> {
  yield { node: company, path: [company.name] };
  for (const branch of company.branches ?? []) {
    yield { node: branch, path: [company.name, branch.name] };
    for (const employee of branch.employees ?? []) {
      yield { node: employee, path: [company.name, branch.name, employee.name] };
      for (const channel of employee.channels ?? []) {
        yield { node: channel, path: [company.name, branch.name, employee.name, channel.name] };
      }
    }
  }
}

/**
 * The response of `GET /api/clients`: the months the figures refer to, plus the company tree
 * exactly as it appears in the brief. Refinement: every node has one value per month.
 */
export const clientsReportSchema = z
  .object({
    months: z.array(isoMonthSchema).min(1),
    company: companyNodeSchema,
  })
  .superRefine((report, ctx) => {
    for (const { node, path } of walkCompany(report.company)) {
      if (node.values.length !== report.months.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['company', ...path],
          message: `"${node.name}" has ${node.values.length} values but there are ${report.months.length} months`,
        });
      }
    }
  });

export type ClientsReport = z.infer<typeof clientsReportSchema>;
