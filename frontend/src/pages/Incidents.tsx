import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listIncidents, Incident } from '../api/incidents';
import styles from './Incidents.module.css';

function severityBadge(ai?: Incident['aiAnalysis']) {
  if (!ai?.severity_hint) return null;
  const s = ai.severity_hint;
  const cls =
    s === 'high' ? styles.sevHigh : s === 'low' ? styles.sevLow : styles.sevMed;
  return <span className={cls}>{s}</span>;
}

export function Incidents() {
  const [items, setItems] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await listIncidents();
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load incidents');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading incidents…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Incidents</h1>
      <p className={styles.subtitle}>
        Failed or timed-out GitHub Actions runs on your tracked repositories. AI triage runs
        automatically when webhooks are configured.
      </p>

      {items.length === 0 ? (
        <div className={styles.card}>
          <p>No incidents yet. When a tracked repo’s workflow completes with failure, timeout, or cancellation, an incident appears here.</p>
          <p className={styles.muted}>
            Configure <Link to="/integrations">Integrations</Link> so GitHub can reach your webhook URL.
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {items.map((inc) => (
            <li key={inc.id} className={styles.listItem}>
              <Link to={`/incidents/${encodeURIComponent(inc.id)}`} className={styles.listLink}>
                <div className={styles.listTop}>
                  <span className={styles.repoTag}>
                    {inc.owner}/{inc.repo}
                  </span>
                  <span className={styles.statusTag} data-status={inc.status}>
                    {inc.status}
                  </span>
                </div>
                <div className={styles.wfLine}>
                  {inc.workflowName || 'Workflow'} ·{' '}
                  <strong>{inc.conclusion || 'unknown'}</strong>
                  {inc.branch ? ` · ${inc.branch}` : ''}
                </div>
                <div className={styles.aiRow}>
                  <span className={styles.aiPill} data-ai={inc.aiStatus}>
                    AI: {inc.aiStatus}
                  </span>
                  {severityBadge(inc.aiAnalysis ?? undefined)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
