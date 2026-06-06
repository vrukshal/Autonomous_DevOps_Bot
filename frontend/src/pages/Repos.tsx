import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGitHubRepos, GitHubRepo } from '../api/github';
import { getTrackedRepos, createTrackedRepo, getRepoKey, TrackedRepo } from '../api/trackedRepos';
import styles from './Repos.module.css';

/**
 * Repos page listing connected GitHub repositories
 */
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
        getTrackedRepos().catch(() => []), // Don't fail if tracked repos fail
      ]);
      setRepos(reposData);
      setTrackedRepos(trackedData);
    } catch (error) {
      console.error('Error loading repos:', error);
      setError('Failed to load repositories. Make sure GitHub is connected.');
    } finally {
      setLoading(false);
    }
  };

  const isTracked = (owner: string, repo: string): boolean => {
    const repoKey = getRepoKey(owner, repo);
    return trackedRepos.some(tr => {
      const trKey = getRepoKey(tr.owner, tr.repo);
      return trKey === repoKey && tr.isTracked;
    });
  };

  const handleTrack = async (repo: GitHubRepo) => {
    try {
      // Parse owner/repo from "owner/repo" format
      const [owner, repoName] = repo.name.split('/');
      if (!owner || !repoName) {
        alert('Invalid repository name format');
        return;
      }

      setTracking(prev => new Set(prev).add(repo.name));
      
      await createTrackedRepo({
        owner,
        repo: repoName,
        repoId: repo.repoId || 0,
        defaultBranch: repo.defaultBranch,
      });

      // Reload tracked repos
      const updatedTracked = await getTrackedRepos();
      setTrackedRepos(updatedTracked);
    } catch (error) {
      console.error('Error tracking repo:', error);
      alert('Failed to track repository. Please try again.');
    } finally {
      setTracking(prev => {
        const next = new Set(prev);
        next.delete(repo.name);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading repositories...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button className={styles.backButton} onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>GitHub Repositories</h1>
      </div>

      <div className={styles.actions}>
        <button 
          className={styles.trackedReposButton}
          onClick={() => navigate('/tracked-repos')}
        >
          View Tracked Repositories →
        </button>
      </div>

      {repos.length === 0 ? (
        <div className={styles.empty}>
          <p>No repositories found.</p>
        </div>
      ) : (
        <div className={styles.repoList}>
          {repos.map((repo) => {
            const [owner, repoName] = repo.name.split('/');
            const tracked = owner && repoName ? isTracked(owner, repoName) : false;
            const isTracking = tracking.has(repo.name);

            return (
              <div key={repo.name} className={styles.repoCard}>
                <div className={styles.repoHeader}>
                  <h3 className={styles.repoName}>{repo.name}</h3>
                  <div className={styles.repoBadges}>
                    <span className={repo.private ? styles.privateBadge : styles.publicBadge}>
                      {repo.private ? 'Private' : 'Public'}
                    </span>
                    {tracked && (
                      <span className={styles.trackedBadge}>Tracked</span>
                    )}
                  </div>
                </div>
                <div className={styles.repoInfo}>
                  <span className={styles.branchInfo}>
                    Default branch: <strong>{repo.defaultBranch}</strong>
                  </span>
                </div>
                <div className={styles.repoActions}>
                  {!tracked ? (
                    <button
                      className={styles.trackButton}
                      onClick={() => handleTrack(repo)}
                      disabled={isTracking}
                    >
                      {isTracking ? 'Tracking...' : 'Track'}
                    </button>
                  ) : (
                    <button
                      className={styles.trackedButton}
                      disabled
                    >
                      ✓ Tracked
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
