import { VisuallyHidden } from '../VisuallyHidden/VisuallyHidden';
import styles from './Spinner.module.css';

export interface SpinnerProps {
  /** Announced to AT as a status. Omit for a purely decorative spinner next to a labelled one. */
  label?: string | undefined;
  size?: number | undefined;
}

/** Indeterminate progress indicator. With `label` it is a polite live status region. */
export function Spinner({ label, size = 24 }: SpinnerProps) {
  return (
    <span
      className={styles.spinner}
      {...(label ? { role: 'status' } : { 'aria-hidden': true })}
      data-spinner
    >
      <svg
        className={styles.ring}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {label && <VisuallyHidden>{label}</VisuallyHidden>}
    </span>
  );
}
