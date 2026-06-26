import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/config';
import { MarketingLayout } from '../components/MarketingLayout';
import { ProductDiagram } from '../components/ProductDiagram';
import ui from '../styles/ui.module.css';
import styles from './Home.module.css';

const CAPABILITIES = [
  {
    title: 'Webhook-driven incidents',
    description: 'Failed workflow runs on tracked repos open incidents automatically — no polling required.',
  },
  {
    title: 'Guardrailed AI triage',
    description: 'Server-side analysis with secret redaction, injection filtering, and validated JSON output.',
  },
  {
    title: 'Encrypted integrations',
    description: 'GitHub tokens stored with AES-256-GCM. Firebase auth on every API request.',
  },
  {
    title: 'Deploy workflow scoping',
    description: 'Filter incidents to specific workflows and environments per repository.',
  },
];

const STEPS = [
  { step: '01', title: 'Connect', description: 'Sign in with Google and authorize GitHub via OAuth.' },
  { step: '02', title: 'Track', description: 'Select production repositories and configure deploy workflows.' },
  { step: '03', title: 'Monitor', description: 'Register webhooks. Failed runs create incidents instantly.' },
  { step: '04', title: 'Respond', description: 'Review AI triage, acknowledge, and resolve from one interface.' },
];

const TRUST_ITEMS = [
  { label: 'Firebase Auth', detail: 'Google sign-in with ID token verification' },
  { label: 'AES-256-GCM', detail: 'Encrypted credential storage at rest' },
  { label: 'HMAC webhooks', detail: 'Signature verification on every delivery' },
  { label: 'Input guardrails', detail: 'Secret redaction before LLM context' },
];

const FAQS = [
  {
    q: 'What triggers an incident?',
    a: 'A workflow_run event that completes with failure, timeout, or cancellation on a tracked repository.',
  },
  {
    q: 'Is AI triage required?',
    a: 'No. Configure OPENAI_API_KEY on the server to enable automated analysis. Without it, incidents are still created and managed manually.',
  },
  {
    q: 'How are webhooks secured?',
    a: 'GitHub deliveries are verified with HMAC-SHA256 using GITHUB_WEBHOOK_SECRET. The endpoint must be publicly reachable over HTTPS.',
  },
  {
    q: 'Can I scope to a deploy workflow?',
    a: 'Yes. Per-repository settings let you filter incidents to a specific GitHub Actions workflow.',
  },
];

export function Home() {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handlePrimary = () => navigate(user ? '/dashboard' : '/login');

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>CI incident management</p>
            <h1 className={styles.headline}>
              Know when production breaks.
              <br />
              Respond with confidence.
            </h1>
            <p className={styles.lead}>
              Monitor GitHub Actions failures, open structured incidents, and get
              guardrailed AI triage — all from one operational interface.
            </p>
            <div className={styles.heroActions}>
              <button type="button" className={ui.btnPrimary} onClick={handlePrimary}>
                {user ? 'Open dashboard' : 'Get started'}
              </button>
              <Link to="/docs" className={`${ui.btnSecondary} ${styles.heroSecondary}`}>
                View documentation
              </Link>
            </div>
          </div>
          <ProductDiagram />
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionIntro}>
            <p className={styles.sectionLabel}>Capabilities</p>
            <h2 className={styles.sectionTitle}>Built for on-call engineers</h2>
            <p className={styles.sectionDesc}>
              Everything you need to detect CI failures and triage them without context switching.
            </p>
          </div>
          <div className={styles.capGrid}>
            {CAPABILITIES.map((cap) => (
              <article key={cap.title} className={styles.capCard}>
                <h3 className={styles.capTitle}>{cap.title}</h3>
                <p className={styles.capDesc}>{cap.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionIntro}>
            <p className={styles.sectionLabel}>How it works</p>
            <h2 className={styles.sectionTitle}>From failure to resolution</h2>
          </div>
          <div className={styles.steps}>
            {STEPS.map((s) => (
              <div key={s.step} className={styles.step}>
                <span className={styles.stepNum}>{s.step}</span>
                <div>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className={styles.section}>
        <div className={`${styles.sectionInner} ${styles.archLayout}`}>
          <div>
            <p className={styles.sectionLabel}>Architecture</p>
            <h2 className={styles.sectionTitle}>Event-driven pipeline</h2>
            <p className={styles.sectionDesc}>
              GitHub delivers signed webhook events. The backend creates idempotent incidents in
              Firestore and optionally queues AI triage as a background job.
            </p>
            <ul className={styles.archList}>
              <li>FastAPI backend with Firebase token verification</li>
              <li>Firestore for incidents, tracked repos, and events</li>
              <li>Background AI analysis with input/output guardrails</li>
              <li>React dashboard for incident lifecycle management</li>
            </ul>
          </div>
          <div className={styles.archDiagram}>
            <div className={styles.archLayer}>
              <span className={styles.archLayerLabel}>Sources</span>
              <span className={styles.archLayerItem}>GitHub Actions</span>
            </div>
            <div className={styles.archArrow} />
            <div className={styles.archLayer}>
              <span className={styles.archLayerLabel}>Processing</span>
              <span className={styles.archLayerItem}>FastAPI + Firestore</span>
            </div>
            <div className={styles.archArrow} />
            <div className={styles.archLayer}>
              <span className={styles.archLayerLabel}>Intelligence</span>
              <span className={styles.archLayerItem}>Guardrailed LLM triage</span>
            </div>
            <div className={styles.archArrow} />
            <div className={styles.archLayer}>
              <span className={styles.archLayerLabel}>Interface</span>
              <span className={styles.archLayerItem}>React dashboard</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionIntro}>
            <p className={styles.sectionLabel}>Security</p>
            <h2 className={styles.sectionTitle}>Engineered for trust</h2>
          </div>
          <div className={styles.trustGrid}>
            {TRUST_ITEMS.map((item) => (
              <div key={item.label} className={styles.trustCard}>
                <span className={styles.trustLabel}>{item.label}</span>
                <span className={styles.trustDetail}>{item.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example workflow */}
      <section className={styles.section}>
        <div className={`${styles.sectionInner} ${styles.exampleLayout}`}>
          <div className={styles.exampleCard}>
            <p className={styles.exampleLabel}>Example incident</p>
            <h3 className={styles.exampleTitle}>acme/api — deploy.yml</h3>
            <div className={styles.exampleMeta}>
              <span className={ui.badgeDanger}>failure</span>
              <span className={ui.badge}>main</span>
            </div>
            <p className={styles.exampleSummary}>
              npm ci failed with lockfile mismatch. Dependency tree out of sync with package-lock.json.
            </p>
            <ul className={styles.exampleSteps}>
              <li>Re-run workflow after syncing lockfile</li>
              <li>Inspect recent dependency commits on main</li>
              <li>Pin affected package version if needed</li>
            </ul>
          </div>
          <div>
            <p className={styles.sectionLabel}>In practice</p>
            <h2 className={styles.sectionTitle}>Structured triage output</h2>
            <p className={styles.sectionDesc}>
              Every incident includes a summary, likely causes, recommended next steps, severity
              hint, and confidence score — validated before display.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionIntro}>
            <p className={styles.sectionLabel}>FAQ</p>
            <h2 className={styles.sectionTitle}>Common questions</h2>
          </div>
          <div className={styles.faqList}>
            {FAQS.map((faq, i) => (
              <details
                key={faq.q}
                className={styles.faqItem}
                open={openFaq === i}
                onToggle={(e) => setOpenFaq((e.target as HTMLDetailsElement).open ? i : null)}
              >
                <summary className={styles.faqQuestion}>{faq.q}</summary>
                <p className={styles.faqAnswer}>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Docs preview + CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <div>
            <p className={styles.sectionLabel}>Documentation</p>
            <h2 className={styles.ctaTitle}>Ready to set up?</h2>
            <p className={styles.ctaDesc}>
              Step-by-step guides for authentication, webhooks, and environment configuration.
            </p>
          </div>
          <div className={styles.ctaActions}>
            <Link to="/docs" className={ui.btnSecondary}>
              Read the docs
            </Link>
            <button type="button" className={ui.btnPrimary} onClick={handlePrimary}>
              {user ? 'Go to dashboard' : 'Get started free'}
            </button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
