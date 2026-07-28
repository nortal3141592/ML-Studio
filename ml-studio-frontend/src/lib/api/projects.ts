import { apiFetch } from './client'
import type { ProjectPublic, MetadataResponse, PreviewRowsResponse, CleaningRequest, DatasetStage, DatasetSplit } from './types/projects'
import type { FeatureEngineeringResponse } from './types/training'


export function uploadProject(name: string, file: File): Promise<ProjectPublic> {
  const form = new FormData()
  form.set('name', name)
  form.set('file', file)
  return apiFetch<ProjectPublic>('/api/projects/upload', {
    method: 'POST',
    body: form,
    isFormData: true,
  })
}

export function getProjects(): Promise<ProjectPublic[]> {
  return apiFetch<ProjectPublic[]>('/api/projects')
}

// export function getProjectMetadata(projectId: number, stage: DatasetStage): Promise<MetadataResponse> {
//   return apiFetch<MetadataResponse>(`/api/projects/${projectId}/preview/${stage}`)
// }

export function getProjectRows(
  projectId: number,
  stage: DatasetStage,
  split?: DatasetSplit
): Promise<PreviewRowsResponse> {
  const query = split ? `?split=${split}` : ''
  return apiFetch<PreviewRowsResponse>(`/api/projects/${projectId}/preview-rows/${stage}${query}`)
}

export function cleanDataset(projectId: number, data: CleaningRequest): Promise<MetadataResponse> {
  return apiFetch<MetadataResponse>(`/api/projects/${projectId}/clean`, {
    method: 'POST',
    body: data,
  })
}

export function deleteProject(projectId: number): Promise<void> {
  return apiFetch<void>(`/api/projects/${projectId}`, { method: 'DELETE' })
}

export function getProjectMetadata(projectId: number, stage: 'raw' | 'cleaned'): Promise<MetadataResponse> {
  return apiFetch<MetadataResponse>(`/api/projects/${projectId}/preview/${stage}`)
}

export function getEngineeredMetadata(projectId: number): Promise<FeatureEngineeringResponse> {
  return apiFetch<FeatureEngineeringResponse>(`/api/projects/${projectId}/preview/engineered`)
}

export function getProject(projectId: number): Promise<ProjectPublic> {
  return apiFetch<ProjectPublic>(`/api/projects/${projectId}`)
}