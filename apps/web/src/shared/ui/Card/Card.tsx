import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/cn';
import styles from './Card.module.css';

export type CardProps = ComponentPropsWithoutRef<'section'>;

/** White rounded surface. Clips its children; put scrolling content in its own scroller. */
export function Card({ className, ...rest }: CardProps) {
  return <section className={cn(styles.card, className)} {...rest} />;
}
