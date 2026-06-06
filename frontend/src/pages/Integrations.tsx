import { useEffect, useState } from 'react';
import {
  getIntegrationsStatus,
  registerRepoWebhook,
  IntegrationsStatus,
} from '../api/integrations';
import { getTrackedRepos, TrackedRepo, getRepoKey } from '../api/trackedRepos';
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
    setMsg('Webhook URL copied to clipboard.');
  };

  const register = async () => {
    if (!selectedKey) return;
    setRegistering(true);
    setMsg(null);
    try {
      const r = await registerRepoWebhook(selectedKey);
      setMsg(r.message || JSON.stringify(r));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setRegistering(false);
    }
  };

  if (loading || !status) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading…</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Integrations</h1>
      <p className={styles.lead}>
        Connect GitHub webhooks to this app so failed workflow runs create incidents and trigger
        guardrailed AI triage. Your backend must be reachable on the public internet (for example
        ngrok, Cloud Run, or a VPS).
      </p>

      <div className={styles.card}>
        <h2>Configuration status</h2>
        <p>
          Public webhook base URL:{' '}
          <span
            className={`${styles.pill} ${
              status.webhookPublicUrlConfigured ? styles.ok : styles.bad
            }`}
          >
            {status.webhookPublicUrlConfigured ? 'Set' : 'Missing WEBHOOK_PUBLIC_URL'}
          </span>
        </p>
        <p>
          Webhook signing secret:{' '}
          <span
            className={`${styles.pill} ${
              status.webhookSecretConfigured ? styles.ok : styles.bad
            }`}
          >
            {status.webhookSecretConfigured ? 'Set' : 'Missing GITHUB_WEBHOOK_SECRET'}
          </span>
        </p>
        <p>
          OpenAI API:{' '}
          <span
            className={`${styles.pill} ${status.openAiConfigured ? styles.ok : styles.bad}`}
          >
            {status.openAiConfigured
              ? `Configured (${status.openAiModel})`
              : 'Optional — OPENAI_API_KEY not set'}
          </span>
        </p>
      </div>

      <div className={styles.card}>
        <h2>Webhook URL (paste into GitHub or use “Register” below)</h2>
        {status.webhookCallbackUrl ? (
          <div className={styles.row}>
            <code className={styles.codeBox}>{status.webhookCallbackUrl}</code>
            <button type="button" className={styles.copyBtn} onClick={copyUrl}>
              Copy
            </button>
          </div>
        ) : (
          <p>
            Set <code>WEBHOOK_PUBLIC_URL</code> in backend <code>.env</code> to your HTTPS origin
            (no trailing slash), e.g. <code>https://abc123.ngrok-free.app</code>
          </p>
        )}
      </div>

      <div className={styles.card}>
        <h2>Manual setup on GitHub</h2>
        <ol className={styles.steps}>
          <li>Open the repository on GitHub → Settings → Webhooks → Add webhook.</li>
          <li>
            Payload URL: use the URL above. Content type: <code>application/json</code>.
          </li>
          <li>
            Secret: the same value as <code>GITHUB_WEBHOOK_SECRET</code> in your backend{' '}
            <code>.env</code>.
          </li>
          <li>Let me select individual events → check “Workflow runs” only.</li>
          <li>Add webhook, then trigger a failing workflow on a tracked repo to test.</li>
        </ol>
      </div>

      <div className={styles.card}>
        <h2>Register webhook via API (OAuth)</h2>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.5 }}>
          Creates a repository hook for <strong>workflow_run</strong> events using your connected
          GitHub account. Requires public <code>WEBHOOK_PUBLIC_URL</code> and{' '}
          <code>GITHUB_WEBHOOK_SECRET</code>.
        </p>
        <div className={styles.registerRow}>
          <select
            className={styles.select}
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
            className={styles.regBtn}
            disabled={registering || !selectedKey || !status.webhookCallbackUrl}
            onClick={register}
          >
            {registering ? 'Working…' : 'Register webhook'}
          </button>
        </div>
        {msg && (
          <p
            className={
              styles.msg + (msg.toLowerCase().includes('fail') ? ` ${styles.error}` : '')
            }
          >
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
