import { useMutation } from '@tanstack/react-query'
import * as downloadsApi from '../api/downloads'

export function useDownloadBundle(projectId: number) {
  return useMutation({ mutationFn: (runId: number) => downloadsApi.downloadBundle(projectId, runId) })
}
export function useDownloadModel(projectId: number) {
  return useMutation({ mutationFn: (runId: number) => downloadsApi.downloadModel(projectId, runId) })
}
export function useDownloadPreprocessor(projectId: number) {
  return useMutation({ mutationFn: () => downloadsApi.downloadPreprocessor(projectId) })
}