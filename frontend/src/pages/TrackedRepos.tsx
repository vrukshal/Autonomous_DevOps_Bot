import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getTrackedRepos,
  deleteTrackedRepo,
  getRepoKey,
  TrackedRepo,
  getGitHubWorkflows,
  GitHubWorkflow,
  updateTrackedRepo,
} from '../api/trackedRepos';
import { registerRepoWebhook } from '../api/integrations';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import { Modal } from '../components/Modal';
import ui from '../styles/ui.module.css';
import styles from './TrackedRepos.module.css';

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
      setTrackedRepos(await getTrackedRepos());
    } catch (err) {
      console.error('Error loading tracked repos:', err);
      setError('Failed to load tracked repositories.');
    } finally {
      setLoading(false);
    }
  };

  const handleUntrack = async (repo: TrackedRepo) => {
    if (!confirm(`Untrack ${repo.owner}/${repo.repo}?`)) return;
    try {
      await deleteTrackedRepo(getRepoKey(repo.owner, repo.repo));
      await loadTrackedRepos();
    } catch (err) {
      alert('Failed to untrack repository.');
    }
  };

  const handleOpenSettings = async (repo: TrackedRepo) => {
    setSelectedRepo(repo);
    setShowSettings(true);
    setLoadingWorkflows(true);
    try {
      setWorkflows(await getGitHubWorkflows(repo.owner, repo.repo));
    } catch (err) {
      alert('Failed to load workflows.');
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
      await updateTrackedRepo(getRepoKey(selectedRepo.owner, selectedRepo.repo), updates);
      await loadTrackedRepos();
      setShowSettings(false);
      setSelectedRepo(null);
    } catch (err) {
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
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
        title="Tracked repositories"
        description="Production targets monitored for workflow failures."
      />

      {trackedRepos.length === 0 ? (
        <div className={`${ui.cardFlat} ${styles.emptyCard}`}>
          <p className={ui.bodyText}>No repositories tracked yet.</p>
          <button type="button" className={ui.btnPrimary} onClick={() => navigate('/repos')}>
            Browse repositories
          </button>
        </div>
      ) : (
        <div className={styles.table}>
          {trackedRepos.map((repo) => (
            <div key={`${repo.owner}_${repo.repo}`} className={styles.row}>
              <div className={styles.info}>
                <p className={styles.name}>
                  {repo.owner}/{repo.repo}
                </p>
                <p className={ui.meta}>
                  {repo.environment}
                  {repo.deployWorkflowName ? ` · ${repo.deployWorkflowName}` : ''}
                  {' · '}
                  {repo.defaultBranch}
                </p>
              </div>
              <div className={styles.actions}>
                <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} onClick={() => handleOpenSettings(repo)}>
                  Settings
                </button>
                <button type="button" className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => handleUntrack(repo)}>
                  Untrack
                </button>
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

function SettingsModal({
  repo,
  workflows,
  loadingWorkflows,
  saving,
  onClose,
  onSave,
}: SettingsModalProps) {
  const [environment, setEnvironment] = useState(repo.environment);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(repo.deployWorkflowId);
  const [hookBusy, setHookBusy] = useState(false);

  const registerHook = async () => {
    setHookBusy(true);
    try {
      const r = await registerRepoWebhook(getRepoKey(repo.owner, repo.repo));
      alert(r.message || 'Webhook registered.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to register webhook.');
    } finally {
      setHookBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);
    onSave({
      environment,
      deployWorkflowId: selectedWorkflowId,
      deployWorkflowName: selectedWorkflowId ? selectedWorkflow?.name || null : null,
    });
  };

  return (
    <Modal
      title={`${repo.owner}/${repo.repo}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={ui.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="repo-settings-form" className={ui.btnPrimary} disabled={saving}>
            {saving ? 'Saving' : 'Save changes'}
          </button>
        </>
      }
    >
      <form id="repo-settings-form" onSubmit={handleSubmit}>
        <div className={ui.formGroup}>
          <label className={ui.label} htmlFor="environment">
            Environment
          </label>
          <select
            id="environment"
            className={ui.select}
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
          >
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
        </div>
        <div className={ui.formGroup}>
          <label className={ui.label} htmlFor="workflow">
            Deploy workflow
          </label>
          {loadingWorkflows ? (
            <p className={ui.meta}>Loading workflows</p>
          ) : (
            <select
              id="workflow"
              className={ui.select}
              value={selectedWorkflowId || ''}
              onChange={(e) =>
                setSelectedWorkflowId(e.target.value ? parseInt(e.target.value, 10) : null)
              }
            >
              <option value="">None</option>
              {workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.state})
                </option>
              ))}
            </select>
          )}
        </div>
        <div className={ui.formGroup}>
          <label className={ui.label}>Webhook</label>
          <p className={ui.meta}>Register workflow_run delivery for this repository.</p>
          <button type="button" className={ui.btnSecondary} disabled={hookBusy} onClick={registerHook}>
            {hookBusy ? 'Working' : 'Register webhook'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
