import { useEffect, useState } from 'react';
import {
  getIntegrationsStatus,
  registerRepoWebhook,
  IntegrationsStatus,
} from '../api/integrations';
import { getTrackedRepos, TrackedRepo, getRepoKey } from '../api/trackedRepos';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import ui from '../styles/ui.module.css';
import styles from './Integrations.module.css';

export function Integrations() {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [tracked, setTracked] = useState<TrackedRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [selectedKey, setSelectedKey] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        setLoading(true);
        const [s, t] = await Promise.all([
          getIntegrationsStatus(),
          getTrackedRepos().catch(() => []),
        ]);
        if (!c) {
          setStatus(s);
          setTracked(t);
          if (t.length && !selectedKey) {
            setSelectedKey(getRepoKey(t[0].owner, t[0].repo));
          }
        }
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const copyUrl = () => {
    if (!status?.webhookCallbackUrl) return;
    void navigator.clipboard.writeText(status.webhookCallbackUrl);
    setMsg('Copied to clipboard.');
  };

  const register = async () => {
    if (!selectedKey) return;
    setRegistering(true);
    setMsg(null);
    try {
      const r = await registerRepoWebhook(selectedKey);
      setMsg(r.message || 'Webhook registered.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  if (loading || !status) return <LoadingState />;

  return (
    <div className={ui.page}>
      <PageHeader
        title="Integrations"
        description="Configure webhooks and verify server environment readiness."
      />

      <div className={styles.grid}>
        <section className={ui.cardFlat}>
          <h2 className={ui.sectionTitle}>Environment status</h2>
          <ul className={styles.statusList}>
            <li>
              <span className={styles.statusLabel}>Webhook URL</span>
              <span className={status.webhookPublicUrlConfigured ? ui.badgeSuccess : ui.badgeWarning}>
                {status.webhookPublicUrlConfigured ? 'Configured' : 'Missing'}
              </span>
            </li>
            <li>
              <span className={styles.statusLabel}>Signing secret</span>
              <span className={status.webhookSecretConfigured ? ui.badgeSuccess : ui.badgeWarning}>
                {status.webhookSecretConfigured ? 'Configured' : 'Missing'}
              </span>
            </li>
            <li>
              <span className={styles.statusLabel}>AI triage</span>
              <span className={status.openAiConfigured ? ui.badgeSuccess : ui.badge}>
                {status.openAiConfigured ? status.openAiModel : 'Not configured'}
              </span>
            </li>
          </ul>
        </section>

        <section className={ui.cardFlat}>
          <h2 className={ui.sectionTitle}>Webhook endpoint</h2>
          {status.webhookCallbackUrl ? (
            <div className={styles.urlRow}>
              <code className={ui.codeBlock}>{status.webhookCallbackUrl}</code>
              <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} onClick={copyUrl}>
                Copy
              </button>
            </div>
          ) : (
            <p className={ui.bodyText}>
              Set <code>WEBHOOK_PUBLIC_URL</code> on the server to your public HTTPS origin.
            </p>
          )}
        </section>

        <section className={ui.cardFlat}>
          <h2 className={ui.sectionTitle}>Manual setup</h2>
          <ol className={styles.steps}>
            <li>Repository Settings → Webhooks → Add webhook</li>
            <li>Paste the endpoint URL; content type application/json</li>
            <li>Secret must match GITHUB_WEBHOOK_SECRET on the server</li>
            <li>Subscribe to Workflow runs only</li>
          </ol>
        </section>

        <section className={ui.cardFlat}>
          <h2 className={ui.sectionTitle}>Register via API</h2>
          <p className={ui.bodyText}>
            Creates a workflow_run hook on a tracked repository using your connected GitHub account.
          </p>
          <div className={styles.registerRow}>
            <select
              className={ui.select}
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              disabled={!tracked.length}
            >
              {tracked.length === 0 ? (
                <option value="">No tracked repositories</option>
              ) : (
                tracked.map((r) => {
                  const k = getRepoKey(r.owner, r.repo);
                  return (
                    <option key={k} value={k}>
                      {r.owner}/{r.repo}
                    </option>
                  );
                })
              )}
            </select>
            <button
              type="button"
              className={ui.btnPrimary}
              disabled={registering || !selectedKey || !status.webhookCallbackUrl}
              onClick={register}
            >
              {registering ? 'Working' : 'Register'}
            </button>
          </div>
          {msg && <p className={styles.msg}>{msg}</p>}
        </section>
      </div>
    </div>
  );
}
