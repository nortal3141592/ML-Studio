import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as trainingApi from '../api/training'
import type { FeatureEngineeringRequest, TrainingRequest } from '../api/types/training'
import type { TrainingStatus } from '../api/types/training'

export function useEngineerFeatures(projectId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: FeatureEngineeringRequest) => trainingApi.engineerFeatures(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'metadata'] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'rows'] })
    },
  })
}

export function useTrainModel(projectId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TrainingRequest) => trainingApi.trainModel(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'runs'] })
    },
  })
}

const TERMINAL_STATUSES: TrainingStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED']

export function useTrainingRunStatus(projectId: number, runId: number) {
  return useQuery({
    queryKey: ['project', projectId, 'runs', runId],
    queryFn: () => trainingApi.getTrainingRunStatus(projectId, runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status && TERMINAL_STATUSES.includes(status as TrainingStatus)) {
        return false // stop polling — run is done, one way or another
      }
      return 2000 // otherwise, poll every 2 seconds
    },
  })
}

export function useDeleteRun(projectId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (runId: number) => trainingApi.deleteRun(projectId, runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'runs'] })
    },
  })
}

export function useProjectRuns(projectId: number) {
  return useQuery({
    queryKey: ['project', projectId, 'runs'],
    queryFn: () => trainingApi.getProjectRuns(projectId),
    refetchInterval: (query) => {
      const runs = query.state.data
      if (!runs) return false
      const anyActive = runs.some((r) => !TERMINAL_STATUSES.includes(r.status as TrainingStatus))
      return anyActive ? 3000 : false
    },
  })
}