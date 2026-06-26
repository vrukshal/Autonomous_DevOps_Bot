import styles from './ProductDiagram.module.css';

export function ProductDiagram() {
  return (
    <div className={styles.wrap} aria-hidden>
      <div className={styles.panel}>
        <div className={styles.flow}>
          <div className={styles.node}>
            <span className={styles.nodeLabel}>GitHub Actions</span>
            <span className={styles.nodeMeta}>workflow_run</span>
          </div>
          <div className={styles.connector} />
          <div className={styles.node}>
            <span className={styles.nodeLabel}>Webhook</span>
            <span className={styles.nodeMeta}>signed delivery</span>
          </div>
          <div className={styles.connector} />
          <div className={styles.node}>
            <span className={styles.nodeLabel}>Incident</span>
            <span className={styles.nodeMeta}>tracked repo</span>
          </div>
          <div className={styles.connector} />
          <div className={`${styles.node} ${styles.nodeAccent}`}>
            <span className={styles.nodeLabel}>AI Triage</span>
            <span className={styles.nodeMeta}>guardrailed</span>
          </div>
        </div>

        <div className={styles.detail}>
          <div className={styles.detailRow}>
            <span className={styles.detailKey}>Status</span>
            <span className={styles.detailVal}>failure</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailKey}>Branch</span>
            <span className={styles.detailVal}>main</span>
          </div>
          <div className={styles.detailBlock}>
            <span className={styles.detailKey}>Summary</span>
            <p className={styles.detailText}>
              Deploy workflow failed during dependency install. Likely lockfile mismatch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
