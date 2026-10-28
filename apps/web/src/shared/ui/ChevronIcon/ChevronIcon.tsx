import { cn } from '../../lib/cn';
import styles from './ChevronIcon.module.css';

export interface ChevronIconProps {
  /** `right` (collapsed) or `down` (expanded); the same path is rotated. */
  direction?: 'right' | 'down' | undefined;
  size?: number | undefined;
  className?: string | undefined;
}

/** Decorative 16px chevron, 1.5px stroke, inherits `currentColor`. Hidden from AT. */
export function ChevronIcon({ direction = 'right', size = 16, className }: ChevronIconProps) {
  return (
    <svg
      className={cn(styles.icon, direction === 'down' && styles.down, className)}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
      data-chevron={direction}
    >
      <path
        d="M6 3.5 10.5 8 6 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
