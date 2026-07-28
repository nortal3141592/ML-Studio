import { downloadFile } from './client'

export function downloadPreprocessor(projectId: number) {
  return downloadFile(`/api/projects/${projectId}/download/preprocessor`, `preprocessor_project_${projectId}.joblib`)
}
export function downloadModel(projectId: number, runId: number) {
  return downloadFile(`/api/projects/${projectId}/runs/${runId}/download/model`, `model_run_${runId}`)
}
export function downloadBundle(projectId: number, runId: number) {
  return downloadFile(`/api/projects/${projectId}/runs/${runId}/download/bundle`, `run_${runId}_bundle.zip`)
}