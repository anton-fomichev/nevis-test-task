import type { ElementType, ReactNode } from 'react';

import styles from './VisuallyHidden.module.css';

export interface VisuallyHiddenProps {
  /** Element to render; `span` by default, `div` when the content is block-level (e.g. a table). */
  as?: ElementType;
  children: ReactNode;
}

/** Content for assistive technology only. */
export function VisuallyHidden({ as: Tag = 'span', children }: VisuallyHiddenProps) {
  return <Tag className={styles.hidden}>{children}</Tag>;
}
