import { signInWithPopup } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { auth, googleProvider } from '../firebase/config';
import { LogoLink } from '../components/Logo';
import ui from '../styles/ui.module.css';
import styles from './Login.module.css';

export function Login() {
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error signing in:', error);
      alert('Failed to sign in. Please try again.');
    }
  };

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <LogoLink />
      </header>

      <div className={styles.center}>
        <div className={styles.panel}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>
            Sign in to manage repositories, incidents, and integrations.
          </p>

          <button
            type="button"
            className={`${ui.btnPrimary} ${styles.submit}`}
            onClick={handleGoogleSignIn}
          >
            Continue with Google
          </button>

          <ul className={styles.features}>
            <li>Firebase-authenticated access</li>
            <li>Encrypted GitHub token storage</li>
            <li>Webhook-driven incident management</li>
          </ul>

          <p className={styles.footer}>
            <Link to="/" className={styles.backLink}>
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
