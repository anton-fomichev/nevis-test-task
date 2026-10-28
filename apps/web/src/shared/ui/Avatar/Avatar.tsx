import styles from './Avatar.module.css';

export interface AvatarProps {
  /** Full name; the initials are derived from it. */
  name: string;
  /** Stable key (the node id) that picks the background colour deterministically. */
  seed: string;
  /** Diameter in px. Default 20 (the design). */
  size?: number | undefined;
}

/** Initials of the first and last word: "Anna Blackwood" → "AB"; "Cher" → "C". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Small, stable hash → hue, so the same adviser always gets the same colour. */
export function hueOf(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % 360;
}

/**
 * Initials avatar. The payload has no photo field (DECISIONS #20); the colour comes from the id,
 * so it is stable across reloads and distinct between advisers. Decorative: the name sits next to it.
 */
export function Avatar({ name, seed, size = 20 }: AvatarProps) {
  return (
    <span
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        background: `hsl(${hueOf(seed)} 45% 82%)`,
      }}
      aria-hidden="true"
      data-avatar
    >
      {initialsOf(name)}
    </span>
  );
}
