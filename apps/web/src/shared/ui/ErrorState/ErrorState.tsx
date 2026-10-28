import styles from './ErrorState.module.css';

export interface ErrorStateProps {
  title: string;
  /** Human-readable detail, shown verbatim. */
  message: string;
  onRetry: () => void;
  /** Disables the button while a retry is in flight. */
  retrying?: boolean | undefined;
}

/** Inline failure notice with a Retry button. Announced assertively (`role="alert"`). */
export function ErrorState({ title, message, onRetry, retrying = false }: ErrorStateProps) {
  return (
    <div role="alert" className={styles.error}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      <button type="button" className={styles.retry} onClick={onRetry} disabled={retrying}>
        {retrying ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  );
}
