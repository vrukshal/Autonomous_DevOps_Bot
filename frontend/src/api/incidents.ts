import { apiRequest } from './client';

export interface Incident {
  id: string;
  repoKey: string;
  owner: string;
  repo: string;
  githubDeliveryId?: string;
  workflowRunId?: number;
  workflowName?: string;
  conclusion?: string;
  branch?: string;
  htmlUrl?: string;
  repositoryFullName?: string;
  status: string;
  aiStatus: string;
  aiAnalysis?: {
    summary: string;
    likely_causes: string[];
    recommended_next_steps: string[];
    severity_hint: string;
    confidence_0_to_1: number;
    guardrail_notes?: string;
    analyzedAt?: string;
  } | null;
  aiError?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export async function listIncidents(): Promise<Incident[]> {
  return apiRequest<Incident[]>('/incidents');
}

export async function getIncident(incidentId: string): Promise<Incident> {
  return apiRequest<Incident>(`/incidents/${encodeURIComponent(incidentId)}`);
}

export async function updateIncidentStatus(
  incidentId: string,
  status: 'open' | 'acknowledged' | 'resolved'
): Promise<Incident> {
  return apiRequest<Incident>(`/incidents/${encodeURIComponent(incidentId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function queueIncidentAnalyze(incidentId: string): Promise<{ queued: boolean }> {
  return apiRequest<{ queued: boolean }>(
    `/incidents/${encodeURIComponent(incidentId)}/analyze`,
    { method: 'POST' }
  );
}
