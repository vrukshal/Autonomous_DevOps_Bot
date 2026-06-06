import { apiRequest } from './client';

export interface GitHubRepo {
  name: string;
  private: boolean;
  defaultBranch: string;
  repoId?: number;
}

export interface GitHubConnectionStatus {
  connected: boolean;
  githubUser?: string;
}

/**
 * Get GitHub connection status
 */
export async function getGitHubStatus(): Promise<GitHubConnectionStatus> {
  return apiRequest<GitHubConnectionStatus>('/github/status');
}

/**
 * Start GitHub OAuth flow
 */
export async function startGitHubAuth(): Promise<{ authUrl: string }> {
  return apiRequest<{ authUrl: string }>('/auth/github/start');
}

/**
 * Get connected GitHub repositories
 */
export async function getGitHubRepos(): Promise<GitHubRepo[]> {
  return apiRequest<GitHubRepo[]>('/github/repos');
}

/**
 * Disconnect GitHub integration
 */
export async function disconnectGitHub(): Promise<void> {
  return apiRequest<void>('/github/disconnect', { method: 'POST' });
}
