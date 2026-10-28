export { buildStackedLayout } from './buildStackedLayout';
export type {
  AxisTick,
  StackedColumn,
  StackedLayout,
  StackedLayoutOptions,
  StackedSegment,
} from './buildStackedLayout';
export { findMismatches, type Mismatch } from './consistency';
export {
  expandedReducer,
  initialExpanded,
  type ExpandedAction,
  type ExpandedState,
} from './expandedState';
export { flattenTree, type VisibleRow } from './flattenTree';
export { toChartSeries, type ChartSeries } from './toChartSeries';
export { normaliseCompany, type NodeKind, type TreeNode } from './types';
