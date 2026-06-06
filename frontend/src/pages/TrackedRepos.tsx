import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrackedRepos, deleteTrackedRepo, getRepoKey, TrackedRepo, getGitHubWorkflows, GitHubWorkflow, updateTrackedRepo } from '../api/trackedRepos';
import { registerRepoWebhook } from '../api/integrations';
import styles from './TrackedRepos.module.css';

/**
 * Tracked Repositories page
 */
export function TrackedRepos() {
  const navigate = useNavigate();
  const [trackedRepos, setTrackedRepos] = useState<TrackedRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<TrackedRepo | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [workflows, setWorkflows] = useState<GitHubWorkflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTrackedRepos();
  }, []);

  const loadTrackedRepos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTrackedRepos();
      setTrackedRepos(data);
    } catch (error) {
      console.error('Error loading tracked repos:', error);
      setError('Failed to load tracked repositories.');
    } finally {
      setLoading(false);
    }
  };

  const handleUntrack = async (repo: TrackedRepo) => {
    if (!confirm(`Are you sure you want to untrack ${repo.owner}/${repo.repo}?`)) {
      return;
    }

    try {
      const repoKey = getRepoKey(repo.owner, repo.repo);
      await deleteTrackedRepo(repoKey);
      await loadTrackedRepos();
    } catch (error) {
      console.error('Error untracking repo:', error);
      alert('Failed to untrack repository. Please try again.');
    }
  };

  const handleOpenSettings = async (repo: TrackedRepo) => {
    setSelectedRepo(repo);
    setShowSettings(true);
    setLoadingWorkflows(true);
    
    try {
      const workflowsData = await getGitHubWorkflows(repo.owner, repo.repo);
      setWorkflows(workflowsData);
    } catch (error) {
      console.error('Error loading workflows:', error);
      alert('Failed to load workflows. Please try again.');
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const handleSaveSettings = async (updates: {
    environment?: string;
    deployWorkflowId?: number | null;
    deployWorkflowName?: string | null;
  }) => {
    if (!selectedRepo) return;

    try {
      setSaving(true);
      const repoKey = getRepoKey(selectedRepo.owner, selectedRepo.repo);
      await updateTrackedRepo(repoKey, updates);
      await loadTrackedRepos();
      setShowSettings(false);
      setSelectedRepo(null);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading tracked repositories...</div>
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
        <h1 className={styles.title}>Tracked repositories</h1>
      </div>

      {trackedRepos.length === 0 ? (
        <div className={styles.empty}>
          <p>No tracked repositories yet.</p>
          <button className={styles.browseButton} onClick={() => navigate('/repos')}>
            Browse Repositories
          </button>
        </div>
      ) : (
        <div className={styles.repoList}>
          {trackedRepos.map((repo) => (
            <div key={`${repo.owner}_${repo.repo}`} className={styles.repoCard}>
              <div className={styles.repoHeader}>
                <div>
                  <h3 className={styles.repoName}>{repo.owner}/{repo.repo}</h3>
                  <div className={styles.repoMeta}>
                    <span className={styles.environmentBadge}>{repo.environment}</span>
                    {repo.deployWorkflowName && (
                      <span className={styles.workflowBadge}>{repo.deployWorkflowName}</span>
                    )}
                  </div>
                </div>
                <div className={styles.repoActions}>
                  <button
                    className={styles.settingsButton}
                    onClick={() => handleOpenSettings(repo)}
                  >
                    Settings
                  </button>
                  <button
                    className={styles.untrackButton}
                    onClick={() => handleUntrack(repo)}
                  >
                    Untrack
                  </button>
                </div>
              </div>
              <div className={styles.repoInfo}>
                <span>Default branch: <strong>{repo.defaultBranch}</strong></span>
                {repo.deployWorkflowId && (
                  <span>Workflow ID: <strong>{repo.deployWorkflowId}</strong></span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showSettings && selectedRepo && (
        <SettingsModal
          repo={selectedRepo}
          workflows={workflows}
          loadingWorkflows={loadingWorkflows}
          saving={saving}
          onClose={() => {
            setShowSettings(false);
            setSelectedRepo(null);
          }}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
}

interface SettingsModalProps {
  repo: TrackedRepo;
  workflows: GitHubWorkflow[];
  loadingWorkflows: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (updates: {
    environment?: string;
    deployWorkflowId?: number | null;
    deployWorkflowName?: string | null;
  }) => void;
}

function SettingsModal({ repo, workflows, loadingWorkflows, saving, onClose, onSave }: SettingsModalProps) {
  const [environment, setEnvironment] = useState(repo.environment);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(repo.deployWorkflowId);
  const [hookBusy, setHookBusy] = useState(false);

  const registerHook = async () => {
    const key = getRepoKey(repo.owner, repo.repo);
    setHookBusy(true);
    try {
      const r = await registerRepoWebhook(key);
      alert(r.message || 'Webhook configured');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to register webhook');
    } finally {
      setHookBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId);
    onSave({
      environment,
      deployWorkflowId: selectedWorkflowId,
      deployWorkflowName: selectedWorkflowId ? selectedWorkflow?.name || null : null,
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Settings: {repo.owner}/{repo.repo}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalContent}>
          <div className={styles.formGroup}>
            <label htmlFor="environment">Environment</label>
            <select
              id="environment"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className={styles.select}
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="workflow">Deploy Workflow</label>
            {loadingWorkflows ? (
              <div className={styles.loading}>Loading workflows...</div>
            ) : (
              <select
                id="workflow"
                value={selectedWorkflowId || ''}
                onChange={(e) => setSelectedWorkflowId(e.target.value ? parseInt(e.target.value) : null)}
                className={styles.select}
              >
                <option value="">None</option>
                {workflows.map((workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.name} ({workflow.state})
                  </option>
                ))}
              </select>
            )}
            {workflows.length === 0 && !loadingWorkflows && (
              <p className={styles.helpText}>No workflows found for this repository.</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>GitHub webhook</label>
            <p className={styles.helpText}>
              Registers a <code>workflow_run</code> webhook on this repo (requires{' '}
              <code>WEBHOOK_PUBLIC_URL</code> and <code>GITHUB_WEBHOOK_SECRET</code> on the server).
            </p>
            <button
              type="button"
              className={styles.webhookButton}
              disabled={hookBusy}
              onClick={registerHook}
            >
              {hookBusy ? 'Working…' : 'Register webhook on GitHub'}
            </button>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveButton} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
