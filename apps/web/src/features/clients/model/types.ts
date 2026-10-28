import type { CompanyNode } from '@nevis/contracts';

/** Level of a node in the hierarchy. Order matters: it is also the tree depth. */
export type NodeKind = 'company' | 'branch' | 'adviser' | 'channel';

/**
 * Uniform view of the API tree. The API nests `branches` → `employees` → `channels`; the UI only
 * ever sees `children`, so table and chart code stay ignorant of the three key names.
 */
export interface TreeNode {
  id: string;
  name: string;
  kind: NodeKind;
  /** One figure per month, in the order of `ClientsReport.months`. */
  values: readonly number[];
  children: readonly TreeNode[];
}

/** Converts the contract's `CompanyNode` into a `TreeNode` tree. Pure; no data is recomputed. */
export function normaliseCompany(company: CompanyNode): TreeNode {
  return {
    id: company.id,
    name: company.name,
    kind: 'company',
    values: company.values,
    children: (company.branches ?? []).map((branch) => ({
      id: branch.id,
      name: branch.name,
      kind: 'branch',
      values: branch.values,
      children: (branch.employees ?? []).map((employee) => ({
        id: employee.id,
        name: employee.name,
        kind: 'adviser',
        values: employee.values,
        children: (employee.channels ?? []).map((channel) => ({
          id: channel.id,
          name: channel.name,
          kind: 'channel',
          values: channel.values,
          children: [],
        })),
      })),
    })),
  };
}
