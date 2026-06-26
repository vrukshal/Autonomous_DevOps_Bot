import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getIncident,
  updateIncidentStatus,
  queueIncidentAnalyze,
  Incident,
} from '../api/incidents';
import { LoadingState } from '../components/LoadingState';
import ui from '../styles/ui.module.css';
import styles from './Incidents.module.css';

export function IncidentDetail() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const [inc, setInc] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!incidentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getIncident(incidentId);
      setInc(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  const setStatus = async (status: 'open' | 'acknowledged' | 'resolved') => {
    if (!incidentId) return;
    setBusy(true);
    try {
      setInc(await updateIncidentStatus(incidentId, status));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const reanalyze = async () => {
    if (!incidentId) return;
    setBusy(true);
    try {
      await queueIncidentAnalyze(incidentId);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Queue failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState />;

  if (error || !inc) {
    return (
      <div className={ui.page}>
        <div className={ui.error}>{error || 'Not found'}</div>
        <Link to="/incidents" className={styles.backLink}>
          Back to incidents
        </Link>
      </div>
    );
  }

  const ai = inc.aiAnalysis;

  return (
    <div className={ui.page}>
      <Link to="/incidents" className={styles.backLink}>
        Incidents
      </Link>

      <header className={styles.detailHeader}>
        <h1 className={styles.detailTitle}>
          {inc.owner}/{inc.repo}
        </h1>
        <p className={ui.meta}>
          {inc.workflowName || 'Workflow'} · {inc.conclusion}
          {inc.branch ? ` · ${inc.branch}` : ''}
        </p>
      </header>

      <section className={`${ui.cardFlat} ${styles.sectionGap}`}>
        <div className={styles.detailActions}>
          <span className={ui.badge}>{inc.status}</span>
          <span className={ui.badgeAccent}>Triage: {inc.aiStatus}</span>
        </div>
        <div className={styles.detailActions}>
          <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} disabled={busy} onClick={() => setStatus('acknowledged')}>
            Acknowledge
          </button>
          <button type="button" className={`${ui.btnGhost} ${ui.btnSm}`} disabled={busy} onClick={() => setStatus('open')}>
            Reopen
          </button>
          <button type="button" className={`${ui.btnPrimary} ${ui.btnSm}`} disabled={busy} onClick={() => setStatus('resolved')}>
            Resolve
          </button>
          <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} disabled={busy} onClick={reanalyze}>
            Re-run triage
          </button>
        </div>
        {inc.htmlUrl && (
          <a className={styles.extLink} href={inc.htmlUrl} target="_blank" rel="noreferrer">
            View on GitHub
          </a>
        )}
      </section>

      {inc.aiError && (
        <div className={`${ui.error} ${styles.sectionGap}`}>Triage error: {inc.aiError}</div>
      )}

      {ai && (
        <section className={`${ui.cardFlat} ${styles.sectionGap}`}>
          <h2 className={ui.sectionTitle}>Analysis</h2>
          <p className={styles.summary}>{ai.summary}</p>
          {ai.likely_causes?.length > 0 && (
            <>
              <h3 className={styles.subheading}>Likely causes</h3>
              <ul className={styles.bullets}>
                {ai.likely_causes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </>
          )}
          {ai.recommended_next_steps?.length > 0 && (
            <>
              <h3 className={styles.subheading}>Recommended steps</h3>
              <ol className={styles.bullets}>
                {ai.recommended_next_steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </>
          )}
          <p className={ui.meta}>
            Severity {ai.severity_hint} · confidence {(ai.confidence_0_to_1 * 100).toFixed(0)}%
          </p>
          {ai.guardrail_notes && <p className={styles.note}>{ai.guardrail_notes}</p>}
        </section>
      )}

      {!ai && inc.aiStatus === 'skipped_no_api_key' && (
        <p className={styles.note}>Server API key not configured for automated triage.</p>
      )}

      {!ai && inc.aiStatus === 'pending' && (
        <p className={styles.note}>Triage in progress. Refresh shortly.</p>
      )}
    </div>
  );
}
