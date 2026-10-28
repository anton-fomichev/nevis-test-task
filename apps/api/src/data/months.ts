import type { IsoMonth } from '@nevis/contracts';

/**
 * The months the twelve figures of every node refer to, in order. The brief's payload does not
 * carry them; the design labels the columns Feb 2024 … Jan 2025 (see DECISIONS #21).
 */
export const MONTHS: readonly IsoMonth[] = [
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
