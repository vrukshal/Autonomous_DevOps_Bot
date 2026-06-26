import styles from './LoadingState.module.css';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.dots} aria-hidden>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
