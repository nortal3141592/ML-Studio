import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as projectsApi from '../api/projects'
import type { CleaningRequest, DatasetStage, DatasetSplit } from '../api/types/projects'

export function useUploadProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, file }: { name: string; file: File }) =>
      projectsApi.uploadProject(name, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects,
  })
}

export function useProjectMetadata(projectId: number, stage: 'raw' | 'cleaned') {
  return useQuery({
    queryKey: ['project', projectId, 'metadata', stage],
    queryFn: () => projectsApi.getProjectMetadata(projectId, stage),
  })
}

export function useEngineeredMetadata(projectId: number) {
  return useQuery({
    queryKey: ['project', projectId, 'metadata', 'engineered'],
    queryFn: () => projectsApi.getEngineeredMetadata(projectId),
  })
}

export function useProjectRows(projectId: number, stage: DatasetStage, split?: DatasetSplit) {
  return useQuery({
    queryKey: ['project', projectId, 'rows', stage, split],
    queryFn: () => projectsApi.getProjectRows(projectId, stage, split),
  })
}

export function useCleanDataset(projectId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CleaningRequest) => projectsApi.cleanDataset(projectId, data),
    onSuccess: () => {
      // cleaning invalidates both the 'cleaned' stage metadata (it now exists/changed)
      // and 'raw', in case cleaning_summary on raw's metadata reflects it too
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'metadata'] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'rows'] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: number) => projectsApi.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useProject(projectId: number) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getProject(projectId),
  })
}