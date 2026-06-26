import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGitHubRepos, GitHubRepo } from '../api/github';
import { getTrackedRepos, createTrackedRepo, getRepoKey, TrackedRepo } from '../api/trackedRepos';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import ui from '../styles/ui.module.css';
import styles from './Repos.module.css';

export function Repos() {
  const navigate = useNavigate();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [trackedRepos, setTrackedRepos] = useState<TrackedRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [reposData, trackedData] = await Promise.all([
        getGitHubRepos(),
        getTrackedRepos().catch(() => []),
      ]);
      setRepos(reposData);
      setTrackedRepos(trackedData);
    } catch (err) {
      console.error('Error loading repos:', err);
      setError('Failed to load repositories. Ensure GitHub is connected.');
    } finally {
      setLoading(false);
    }
  };

  const isTracked = (owner: string, repo: string): boolean => {
    const repoKey = getRepoKey(owner, repo);
    return trackedRepos.some((tr) => getRepoKey(tr.owner, tr.repo) === repoKey && tr.isTracked);
  };

  const handleTrack = async (repo: GitHubRepo) => {
    const [owner, repoName] = repo.name.split('/');
    if (!owner || !repoName) {
      alert('Invalid repository name format');
      return;
    }

    setTracking((prev) => new Set(prev).add(repo.name));
    try {
      await createTrackedRepo({
        owner,
        repo: repoName,
        repoId: repo.repoId || 0,
        defaultBranch: repo.defaultBranch,
      });
      setTrackedRepos(await getTrackedRepos());
    } catch (err) {
      console.error('Error tracking repo:', err);
      alert('Failed to track repository.');
    } finally {
      setTracking((prev) => {
        const next = new Set(prev);
        next.delete(repo.name);
        return next;
      });
    }
  };

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className={ui.pageWide}>
        <div className={ui.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={ui.pageWide}>
      <PageHeader
        title="Repositories"
        description="Browse your GitHub repositories and add them to tracking."
        actions={
          <button type="button" className={ui.btnSecondary} onClick={() => navigate('/tracked-repos')}>
            View tracked
          </button>
        }
      />

      {repos.length === 0 ? (
        <div className={ui.cardFlat}>
          <p className={ui.empty}>No repositories found.</p>
        </div>
      ) : (
        <div className={styles.table}>
          {repos.map((repo) => {
            const [owner, repoName] = repo.name.split('/');
            const tracked = owner && repoName ? isTracked(owner, repoName) : false;
            const isTracking = tracking.has(repo.name);

            return (
              <div key={repo.name} className={styles.row}>
                <div className={styles.main}>
                  <span className={styles.name}>{repo.name}</span>
                  <span className={ui.meta}>
                    {repo.private ? 'Private' : 'Public'} · {repo.defaultBranch}
                  </span>
                </div>
                <div className={styles.actions}>
                  {tracked ? (
                    <span className={ui.badgeSuccess}>Tracked</span>
                  ) : (
                    <button
                      type="button"
                      className={`${ui.btnPrimary} ${ui.btnSm}`}
                      onClick={() => handleTrack(repo)}
                      disabled={isTracking}
                    >
                      {isTracking ? 'Tracking' : 'Track'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
