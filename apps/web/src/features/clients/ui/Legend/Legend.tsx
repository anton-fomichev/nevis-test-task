import styles from './Legend.module.css';

export interface LegendItem {
  id: string;
  label: string;
  /** Any CSS colour, including `var(--series-1)`. */
  color: string;
}

export interface LegendProps {
  items: readonly LegendItem[];
  /** Accessible name of the list. Default "Legend". */
  label?: string | undefined;
}

/** Centered row of 8px swatches + labels, as under the chart in the design. */
export function Legend({ items, label = 'Legend' }: LegendProps) {
  return (
    <ul className={styles.legend} aria-label={label}>
      {items.map((item) => (
        <li key={item.id} className={styles.item}>
          <span className={styles.swatch} style={{ background: item.color }} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
