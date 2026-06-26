import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listIncidents, Incident } from '../api/incidents';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import ui from '../styles/ui.module.css';
import styles from './Incidents.module.css';

function statusBadge(status: string) {
  if (status === 'resolved') return ui.badgeSuccess;
  if (status === 'acknowledged') return ui.badgeAccent;
  if (status === 'open') return ui.badgeWarning;
  return ui.badge;
}

function aiBadge(aiStatus: string) {
  if (aiStatus === 'completed') return ui.badgeSuccess;
  if (aiStatus === 'failed') return ui.badgeDanger;
  if (aiStatus === 'pending') return ui.badgeAccent;
  return ui.badge;
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

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className={ui.page}>
        <div className={ui.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={ui.page}>
      <PageHeader
        title="Incidents"
        description={
          <>
            Failed workflow runs on tracked repositories.{' '}
            <Link to="/integrations" className={styles.inlineLink}>
              Configure webhooks
            </Link>
          </>
        }
      />

      {items.length === 0 ? (
        <div className={ui.cardFlat}>
          <p className={ui.empty}>No incidents recorded yet.</p>
        </div>
      ) : (
        <ul className={ui.list}>
          {items.map((inc) => (
            <li key={inc.id} className={ui.listItem}>
              <Link to={`/incidents/${encodeURIComponent(inc.id)}`} className={ui.listLink}>
                <div className={styles.rowTop}>
                  <span className={styles.repoName}>
                    {inc.owner}/{inc.repo}
                  </span>
                  <div className={styles.badges}>
                    <span className={statusBadge(inc.status)}>{inc.status}</span>
                    <span className={aiBadge(inc.aiStatus)}>{inc.aiStatus}</span>
                  </div>
                </div>
                <p className={ui.meta}>
                  {inc.workflowName || 'Workflow'} · {inc.conclusion || 'unknown'}
                  {inc.branch ? ` · ${inc.branch}` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
