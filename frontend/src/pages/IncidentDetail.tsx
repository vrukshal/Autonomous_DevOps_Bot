import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getIncident,
  updateIncidentStatus,
  queueIncidentAnalyze,
  Incident,
} from '../api/incidents';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when id changes
  }, [incidentId]);

  const setStatus = async (status: 'open' | 'acknowledged' | 'resolved') => {
    if (!incidentId) return;
    setBusy(true);
    try {
      const updated = await updateIncidentStatus(incidentId, status);
      setInc(updated);
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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading…</div>
      </div>
    );
  }

  if (error || !inc) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>{error || 'Not found'}</div>
        <Link to="/incidents" className={styles.backLink}>
          ← Incidents
        </Link>
      </div>
    );
  }

  const ai = inc.aiAnalysis;

  return (
    <div className={styles.container}>
      <Link to="/incidents" className={styles.backLink}>
        ← All incidents
      </Link>
      <h1 className={styles.title}>
        {inc.owner}/{inc.repo}
      </h1>
      <p className={styles.subtitle}>
        {inc.workflowName || 'Workflow'} · conclusion: <strong>{inc.conclusion}</strong>
        {inc.branch ? ` · branch ${inc.branch}` : ''}
      </p>

      <div className={styles.card} style={{ marginBottom: 16 }}>
        <div className={styles.detailActions}>
          <span className={styles.statusTag} data-status={inc.status}>
            {inc.status}
          </span>
          <span className={styles.aiPill} data-ai={inc.aiStatus}>
            AI: {inc.aiStatus}
          </span>
        </div>
        <div className={styles.detailActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            disabled={busy}
            onClick={() => setStatus('acknowledged')}
          >
            Acknowledge
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            disabled={busy}
            onClick={() => setStatus('open')}
          >
            Reopen
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={busy}
            onClick={() => setStatus('resolved')}
          >
            Resolve
          </button>
          <button
            type="button"
            className={styles.btnGhost}
            disabled={busy}
            onClick={reanalyze}
          >
            Re-run AI
          </button>
        </div>
        {inc.htmlUrl && (
          <a
            className={styles.extLink}
            href={inc.htmlUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open run on GitHub ↗
          </a>
        )}
      </div>

      {inc.aiError && (
        <div className={styles.errorBox} style={{ marginBottom: 16 }}>
          AI error: {inc.aiError}
        </div>
      )}

      {ai && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>AI triage (guardrailed)</h2>
          <p className={styles.aiSummary}>{ai.summary}</p>
          {ai.likely_causes && ai.likely_causes.length > 0 && (
            <>
              <h3 className={styles.h3}>Likely causes</h3>
              <ul className={styles.bullets}>
                {ai.likely_causes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </>
          )}
          {ai.recommended_next_steps && ai.recommended_next_steps.length > 0 && (
            <>
              <h3 className={styles.h3}>Recommended next steps</h3>
              <ol className={styles.bullets}>
                {ai.recommended_next_steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </>
          )}
          <p className={styles.metaLine}>
            Model severity hint: <strong>{ai.severity_hint}</strong> · confidence{' '}
            {(ai.confidence_0_to_1 * 100).toFixed(0)}%
            {ai.analyzedAt ? ` · ${ai.analyzedAt}` : ''}
          </p>
          {ai.guardrail_notes && (
            <p className={styles.guardNote}>
              <strong>Guardrails / caveats:</strong> {ai.guardrail_notes}
            </p>
          )}
        </div>
      )}

      {!ai && inc.aiStatus === 'skipped_no_api_key' && (
        <div className={styles.hint}>
          AI triage is disabled until you set <code>OPENAI_API_KEY</code> on the backend. See README
          for setup.
        </div>
      )}

      {!ai && inc.aiStatus === 'pending' && (
        <div className={styles.hint}>AI analysis is running or queued… refresh in a few seconds.</div>
      )}
    </div>
  );
}
