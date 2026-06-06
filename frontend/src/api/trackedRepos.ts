import { apiRequest } from './client';

export interface TrackedRepo {
  owner: string;
  repo: string;
  repoId: number;
  defaultBranch: string;
  isTracked: boolean;
  environment: string;
  deployDetectionMode: string;
  deployWorkflowId: number | null;
  deployWorkflowName: string | null;
  createdAt: any;
  updatedAt: any;
}

export interface GitHubWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
}

export interface CreateTrackedRepoRequest {
  owner: string;
  repo: string;
  repoId: number;
  defaultBranch: string;
}

export interface UpdateTrackedRepoRequest {
  environment?: string;
  deployWorkflowId?: number | null;
  deployWorkflowName?: string | null;
}

/**
 * Create a new tracked repository
 */
export async function createTrackedRepo(
  request: CreateTrackedRepoRequest
): Promise<TrackedRepo> {
  return apiRequest<TrackedRepo>('/tracked-repos', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Get all tracked repositories
 */
export async function getTrackedRepos(): Promise<TrackedRepo[]> {
  return apiRequest<TrackedRepo[]>('/tracked-repos');
}

/**
 * Update tracked repository settings
 */
export async function updateTrackedRepo(
  repoKey: string,
  updates: UpdateTrackedRepoRequest
): Promise<TrackedRepo> {
  return apiRequest<TrackedRepo>(`/tracked-repos/${repoKey}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Delete (untrack) a repository
 */
export async function deleteTrackedRepo(repoKey: string): Promise<void> {
  return apiRequest<void>(`/tracked-repos/${repoKey}`, {
    method: 'DELETE',
  });
}

/**
 * Get GitHub Actions workflows for a repository
 */
export async function getGitHubWorkflows(
  owner: string,
  repo: string
): Promise<GitHubWorkflow[]> {
  return apiRequest<GitHubWorkflow[]>(
    `/github/workflows?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
  );
}

/**
 * Generate repo key from owner and repo name
 */
export function getRepoKey(owner: string, repo: string): string {
  return `${owner.toLowerCase()}_${repo.toLowerCase()}`;
}
