import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGitHubStatus, startGitHubAuth, disconnectGitHub } from '../api/github';
import styles from './Dashboard.module.css';

/**
 * Dashboard page showing GitHub connection status
 */
export function Dashboard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<{ connected: boolean; githubUser?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await getGitHubStatus();
      setStatus(data);
    } catch (error) {
      console.error('Error loading status:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('not found') && !errorMessage.includes('404')) {
        alert('Failed to load GitHub status. Please try again.');
      }
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setActionLoading(true);
      const { authUrl } = await startGitHubAuth();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error starting GitHub auth:', error);
      alert('Failed to start GitHub authentication');
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect GitHub?')) {
      return;
    }

    try {
      setActionLoading(true);
      await disconnectGitHub();
      await loadStatus();
    } catch (error) {
      console.error('Error disconnecting GitHub:', error);
      alert('Failed to disconnect GitHub');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>GitHub Integration</h2>
        {status?.connected ? (
          <div className={styles.statusContainer}>
            <div className={styles.statusConnected}>
              <span className={styles.statusDot}></span>
              Connected
            </div>
            {status.githubUser && (
              <p className={styles.githubUser}>User: {status.githubUser}</p>
            )}
            <div className={styles.buttonGroup}>
              <button
                className={styles.disconnectButton}
                onClick={handleDisconnect}
                disabled={actionLoading}
              >
                {actionLoading ? 'Disconnecting...' : 'Disconnect GitHub'}
              </button>
              <button
                className={styles.reposButton}
                onClick={() => navigate('/repos')}
              >
                View Repositories
              </button>
              <button
                className={styles.reposButton}
                onClick={() => navigate('/integrations')}
              >
                Webhooks & AI setup
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.statusContainer}>
            <div className={styles.statusDisconnected}>
              <span className={styles.statusDot}></span>
              Not Connected
            </div>
            <p className={styles.description}>
              Connect your GitHub account to manage repositories and CI incidents.
            </p>
            <button
              className={styles.connectButton}
              onClick={handleConnect}
              disabled={actionLoading}
            >
              {actionLoading ? 'Connecting...' : 'Connect GitHub'}
            </button>
          </div>
        )}
      </div>

      <div className={styles.hint}>
        <strong>Incidents & AI:</strong> Track repos under Repos → Track, then open{' '}
        <button
          type="button"
          className={styles.inlineLink}
          onClick={() => navigate('/integrations')}
        >
          Integrations
        </button>{' '}
        to register a GitHub webhook. Failed workflows create incidents and run guardrailed triage
        when <code>OPENAI_API_KEY</code> is set on the server.
      </div>
    </div>
  );
}
