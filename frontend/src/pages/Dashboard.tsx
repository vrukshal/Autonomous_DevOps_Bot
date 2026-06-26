import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGitHubStatus, startGitHubAuth, disconnectGitHub } from '../api/github';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import ui from '../styles/ui.module.css';
import styles from './Dashboard.module.css';

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
    return <LoadingState />;
  }

  const connected = status?.connected;

  return (
    <div className={ui.pageWide}>
      <PageHeader
        title="Dashboard"
        description="Overview of your GitHub connection and quick access to key workflows."
      />

      <div className={styles.grid}>
        <section className={styles.primaryCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>GitHub</h2>
            {connected ? (
              <span className={ui.badgeSuccess}>Connected</span>
            ) : (
              <span className={ui.badge}>Not connected</span>
            )}
          </div>

          {connected ? (
            <>
              {status.githubUser && (
                <p className={styles.connectedAs}>
                  Signed in as <strong>{status.githubUser}</strong>
                </p>
              )}
              <div className={ui.btnGroup}>
                <button type="button" className={ui.btnSecondary} onClick={() => navigate('/repos')}>
                  Repositories
                </button>
                <button type="button" className={ui.btnSecondary} onClick={() => navigate('/integrations')}>
                  Integrations
                </button>
                <button
                  type="button"
                  className={ui.btnDanger}
                  onClick={handleDisconnect}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Disconnecting' : 'Disconnect'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={styles.cardDesc}>
                Connect GitHub to track repositories and receive workflow failure incidents.
              </p>
              <button
                type="button"
                className={ui.btnPrimary}
                onClick={handleConnect}
                disabled={actionLoading}
              >
                {actionLoading ? 'Connecting' : 'Connect GitHub'}
              </button>
            </>
          )}
        </section>

        <section className={styles.quickLinks}>
          <h2 className={styles.quickTitle}>Quick links</h2>
          <div className={styles.quickGrid}>
            <button type="button" className={styles.quickCard} onClick={() => navigate('/tracked-repos')}>
              <span className={styles.quickLabel}>Tracked repos</span>
              <span className={styles.quickDesc}>Manage production targets</span>
            </button>
            <button type="button" className={styles.quickCard} onClick={() => navigate('/incidents')}>
              <span className={styles.quickLabel}>Incidents</span>
              <span className={styles.quickDesc}>Review CI failures</span>
            </button>
            <button type="button" className={styles.quickCard} onClick={() => navigate('/integrations')}>
              <span className={styles.quickLabel}>Webhooks</span>
              <span className={styles.quickDesc}>Configure delivery</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
