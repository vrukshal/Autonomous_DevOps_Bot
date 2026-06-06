import { apiRequest } from './client';

export interface IntegrationsStatus {
  webhookCallbackUrl: string | null;
  webhookPublicUrlConfigured: boolean;
  webhookSecretConfigured: boolean;
  openAiConfigured: boolean;
  openAiModel: string;
}

export async function getIntegrationsStatus(): Promise<IntegrationsStatus> {
  return apiRequest<IntegrationsStatus>('/integrations/status');
}

export async function registerRepoWebhook(
  repoKey: string
): Promise<{ created: boolean; hookId?: number; message?: string }> {
  return apiRequest(`/tracked-repos/${encodeURIComponent(repoKey)}/github-webhook`, {
    method: 'POST',
  });
}
