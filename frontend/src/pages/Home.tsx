import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/config';
import { Logo } from '../components/Logo';
import styles from './Home.module.css';

/**
 * Home / landing page
 */
export function Home() {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroLogo}>
            <Logo size="large" showText={true} />
          </div>
          <p className={styles.heroSubtitle}>
            CI incidents, webhooks, and guardrailed AI triage for the repositories you care about
          </p>
          <p className={styles.heroDescription}>
            Connect GitHub securely, track production repos, and let failed workflow runs open
            incidents with structured AI analysis—redacted secrets, validated outputs, and
            actionable next steps.
          </p>
          <button className={styles.ctaButton} onClick={handleGetStarted}>
            {user ? 'Go to Dashboard' : 'Get Started'}
          </button>
        </div>
      </div>

      <div className={styles.features}>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>🔐</div>
          <h3 className={styles.featureTitle}>Secure Authentication</h3>
          <p className={styles.featureDescription}>
            Sign in with Google (Firebase). Every API call sends a verified ID token; GitHub tokens
            stay encrypted at rest.
          </p>
        </div>

        <div className={styles.feature}>
          <div className={styles.featureIcon}>⚡</div>
          <h3 className={styles.featureTitle}>Webhook-Driven Incidents</h3>
          <p className={styles.featureDescription}>
            GitHub <code>workflow_run</code> webhooks open incidents when runs fail, time out, or
            cancel. Optionally scope to a single deploy workflow per tracked repo.
          </p>
        </div>

        <div className={styles.feature}>
          <div className={styles.featureIcon}>🤖</div>
          <h3 className={styles.featureTitle}>Guardrailed AI</h3>
          <p className={styles.featureDescription}>
            Optional OpenAI analysis with secret redaction, injection heuristics on log snippets, low
            temperature, JSON-only responses, and schema validation before anything is stored.
          </p>
        </div>

        <div className={styles.feature}>
          <div className={styles.featureIcon}>🔗</div>
          <h3 className={styles.featureTitle}>GitHub Integration</h3>
          <p className={styles.featureDescription}>
            OAuth for repos and workflows; one-click webhook registration when your API is
            reachable on the public internet (ngrok, cloud, or VPS).
          </p>
        </div>
      </div>

      <div className={styles.howItWorks}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3 className={styles.stepTitle}>Sign In</h3>
            <p className={styles.stepDescription}>
              Authenticate with Google using Firebase
            </p>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3 className={styles.stepTitle}>Connect &amp; Track</h3>
            <p className={styles.stepDescription}>
              Connect GitHub, track repos, and configure deploy workflows where needed
            </p>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3 className={styles.stepTitle}>Webhooks &amp; Triage</h3>
            <p className={styles.stepDescription}>
              Point GitHub webhooks at your API; failures become incidents with AI triage in the app
            </p>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          Ready to streamline your DevOps workflow?
        </p>
        <button className={styles.footerButton} onClick={handleGetStarted}>
          {user ? 'Go to Dashboard' : 'Get Started Now'}
        </button>
      </div>
    </div>
  );
}
