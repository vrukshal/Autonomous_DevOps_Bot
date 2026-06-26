import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../components/MarketingLayout';
import ui from '../styles/ui.module.css';
import styles from './Docs.module.css';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'setup', label: 'Setup' },
  { id: 'auth', label: 'Authentication' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'ai-triage', label: 'AI triage' },
  { id: 'env', label: 'Environment' },
];

export function Docs() {
  const [activeTab, setActiveTab] = useState<'backend' | 'frontend'>('backend');

  return (
    <MarketingLayout>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <p className={styles.sidebarTitle}>Documentation</p>
          <nav aria-label="Documentation sections">
            <ul className={styles.sidebarNav}>
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className={styles.sidebarLink}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className={styles.sidebarCta}>
            <Link to="/login" className={ui.btnPrimary}>
              Get started
            </Link>
          </div>
        </aside>

        <article className={styles.content}>
          <header className={styles.docHeader}>
            <h1 className={styles.docTitle}>Documentation</h1>
            <p className={styles.docLead}>
              Setup guides and configuration reference for DevOps Bot.
            </p>
          </header>

          <section id="overview" className={styles.docSection}>
            <h2 className={styles.docHeading}>Overview</h2>
            <p className={styles.docText}>
              DevOps Bot monitors GitHub Actions workflow failures on tracked repositories.
              When a run completes with failure, timeout, or cancellation, an incident is created
              and optional AI triage runs server-side.
            </p>
            <div className={styles.callout}>
              <p>
                Requires a publicly reachable HTTPS backend for webhook delivery. See{' '}
                <a href="#webhooks">Webhooks</a> for configuration.
              </p>
            </div>
          </section>

          <section id="setup" className={styles.docSection}>
            <h2 className={styles.docHeading}>Setup</h2>
            <ol className={styles.docList}>
              <li>Clone the repository and configure backend environment variables</li>
              <li>Start the FastAPI server on port 8000</li>
              <li>Start the React frontend on port 3000</li>
              <li>Sign in, connect GitHub, and track repositories</li>
              <li>Register webhooks from Integrations or per-repo settings</li>
            </ol>

            <div className={styles.tabs}>
              <div className={styles.tabBar} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'backend'}
                  className={`${styles.tab} ${activeTab === 'backend' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('backend')}
                >
                  Backend
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'frontend'}
                  className={`${styles.tab} ${activeTab === 'frontend' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('frontend')}
                >
                  Frontend
                </button>
              </div>
              <div className={styles.tabPanel} role="tabpanel">
                {activeTab === 'backend' ? (
                  <pre className={styles.code}>
                    <code>{`cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
uvicorn main:app --reload --port 8000`}</code>
                  </pre>
                ) : (
                  <pre className={styles.code}>
                    <code>{`cd frontend
npm install
cp .env.example .env
# Set VITE_API_BASE_URL if needed
npm run dev`}</code>
                  </pre>
                )}
              </div>
            </div>
          </section>

          <section id="auth" className={styles.docSection}>
            <h2 className={styles.docHeading}>Authentication</h2>
            <p className={styles.docText}>
              Users sign in with Google via Firebase Authentication. Every API request includes
              a Firebase ID token verified by the backend.
            </p>
            <p className={styles.docText}>
              GitHub access uses a separate OAuth flow. Tokens are encrypted with AES-256-GCM
              before storage in Firestore.
            </p>
          </section>

          <section id="webhooks" className={styles.docSection}>
            <h2 className={styles.docHeading}>Webhooks</h2>
            <p className={styles.docText}>
              GitHub delivers <code>workflow_run</code> events to your backend endpoint.
              Configure these environment variables:
            </p>
            <ul className={styles.docBullets}>
              <li>
                <code>WEBHOOK_PUBLIC_URL</code> — public HTTPS origin (e.g. Railway URL)
              </li>
              <li>
                <code>GITHUB_WEBHOOK_SECRET</code> — shared secret for HMAC verification
              </li>
            </ul>
            <p className={styles.docText}>
              Register webhooks manually in GitHub repository settings, or use the API
              registration from the Integrations page.
            </p>
            <pre className={styles.code}>
              <code>POST /api/webhooks/github</code>
            </pre>
          </section>

          <section id="ai-triage" className={styles.docSection}>
            <h2 className={styles.docHeading}>AI triage</h2>
            <p className={styles.docText}>
              When <code>OPENAI_API_KEY</code> is configured, failed incidents trigger
              background AI analysis with guardrails:
            </p>
            <ul className={styles.docBullets}>
              <li>Secret redaction from webhook payload context</li>
              <li>Prompt injection filtering in log text</li>
              <li>JSON schema validation on model output</li>
            </ul>
            <p className={styles.docText}>
              Optional: set <code>OPENAI_MODEL</code> and <code>OPENAI_BASE_URL</code> for
              custom endpoints.
            </p>
          </section>

          <section id="env" className={styles.docSection}>
            <h2 className={styles.docHeading}>Environment variables</h2>
            <div className={styles.envTable}>
              <div className={styles.envRow}>
                <code className={styles.envKey}>GITHUB_CLIENT_ID</code>
                <span className={styles.envDesc}>GitHub OAuth App client ID</span>
              </div>
              <div className={styles.envRow}>
                <code className={styles.envKey}>GITHUB_CLIENT_SECRET</code>
                <span className={styles.envDesc}>GitHub OAuth App secret</span>
              </div>
              <div className={styles.envRow}>
                <code className={styles.envKey}>GITHUB_TOKEN_ENC_KEY</code>
                <span className={styles.envDesc}>32-byte hex key for token encryption</span>
              </div>
              <div className={styles.envRow}>
                <code className={styles.envKey}>GITHUB_WEBHOOK_SECRET</code>
                <span className={styles.envDesc}>Webhook signature verification secret</span>
              </div>
              <div className={styles.envRow}>
                <code className={styles.envKey}>WEBHOOK_PUBLIC_URL</code>
                <span className={styles.envDesc}>Public HTTPS backend URL</span>
              </div>
              <div className={styles.envRow}>
                <code className={styles.envKey}>OPENAI_API_KEY</code>
                <span className={styles.envDesc}>Enables automated incident triage</span>
              </div>
              <div className={styles.envRow}>
                <code className={styles.envKey}>FIREBASE_*</code>
                <span className={styles.envDesc}>Firebase Admin SDK credentials</span>
              </div>
            </div>
          </section>
        </article>
      </div>
    </MarketingLayout>
  );
}
