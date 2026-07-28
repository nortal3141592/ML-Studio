import { apiFetch } from './client'
import type { FeatureEngineeringRequest, FeatureEngineeringResponse, TrainingRequest, TrainingResponse, TrainingRunStatusResponse } from './types/training'

export function engineerFeatures(projectId: number, data: FeatureEngineeringRequest): Promise<FeatureEngineeringResponse> {
  return apiFetch<FeatureEngineeringResponse>(`/api/projects/${projectId}/engineer`, {
    method: 'POST',
    body: data,
  })
}

export function trainModel(projectId: number, data: TrainingRequest): Promise<TrainingResponse> {
  return apiFetch<TrainingResponse>(`/api/projects/${projectId}/train`, {
    method: 'POST',
    body: data,
  })
}

export function getTrainingRunStatus(projectId: number, runId: number): Promise<TrainingRunStatusResponse> {
  return apiFetch<TrainingRunStatusResponse>(`/api/projects/${projectId}/runs/${runId}`)
}

export function deleteRun(projectId: number, runId: number): Promise<void> {
  return apiFetch<void>(`/api/projects/${projectId}/runs/${runId}`, { method: 'DELETE' })
}

export function getProjectRuns(projectId: number): Promise<TrainingRunStatusResponse[]> {
  return apiFetch<TrainingRunStatusResponse[]>(`/api/projects/${projectId}/runs`)
}