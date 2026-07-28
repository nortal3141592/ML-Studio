// import { useQuery } from '@tanstack/react-query'
import * as evaluationApi from '../api/evaluation'
import { useQueries, useQuery } from '@tanstack/react-query'
import type { Metric } from '../api/types/evaluation'

// One metric = one bar-chart request. Since the NUMBER of metrics depends on task type
// (4 for regression, 5 for classification) and isn't known until data loads, we can't call
// useQuery in a loop directly — React's rules of hooks forbid a variable number of hook calls
// between renders. useQueries is TanStack Query's purpose-built escape hatch: one hook call,
// fed an array of query configs, that correctly handles the array changing length or content
// across renders — it manages the "variable number of queries" problem internally so we don't have to.
export function useBarCharts(projectId: number, runId: number, metrics: Metric[]) {
  return useQueries({
    queries: metrics.map((metric) => ({
      queryKey: ['project', projectId, 'runs', runId, 'bar-chart', metric],
      queryFn: () => evaluationApi.getBarChartData(projectId, runId, metric),
    })),
  })
}

export function useGeneralizationGaps(projectId: number, runId: number) {
  return useQuery({
    queryKey: ['project', projectId, 'runs', runId, 'generalization-gaps'],
    queryFn: () => evaluationApi.getGeneralizationGaps(projectId, runId),
  })
}

export function useInsights(projectId: number, runId: number) {
  return useQuery({
    queryKey: ['project', projectId, 'runs', runId, 'insights'],
    queryFn: () => evaluationApi.getInsights(projectId, runId),
  })
}

export function useLossCurve(projectId: number, runId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['project', projectId, 'runs', runId, 'loss-curve'],
    queryFn: () => evaluationApi.getLossCurve(projectId, runId),
    enabled,
  })
}

export function useFeatureImportance(projectId: number, runId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['project', projectId, 'runs', runId, 'feature-importance'],
    queryFn: () => evaluationApi.getFeatureImportance(projectId, runId),
    enabled,
  })
}

export function useCoefficients(projectId: number, runId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['project', projectId, 'runs', runId, 'coefficients'],
    queryFn: () => evaluationApi.getCoefficients(projectId, runId),
    enabled,
  })
}


export function useRunMetrics(projectId: number, runId: number) {
  return useQuery({
    queryKey: ['project', projectId, 'runs', runId, 'metrics'],
    queryFn: () => evaluationApi.getRunMetrics(projectId, runId),
  })
}

export function useLeaderboard(projectId: number, sortBy: Metric) {
  return useQuery({
    queryKey: ['project', projectId, 'dashboard', 'leaderboard', sortBy],
    queryFn: () => evaluationApi.getLeaderboard(projectId, sortBy),
  })
}

export function useMetricComparisons(projectId: number, metrics: Metric[]) {
  return useQueries({
    queries: metrics.map((metric) => ({
      queryKey: ['project', projectId, 'dashboard', 'metric-comparison', metric],
      queryFn: () => evaluationApi.getMetricComparison(projectId, metric),
    })),
  })
}
export function useGeneralizationGapComparison(projectId: number, metric: Metric) {
  return useQuery({
    queryKey: ['project', projectId, 'dashboard', 'gap-comparison', metric],
    queryFn: () => evaluationApi.getGeneralizationGapComparison(projectId, metric),
  })
}
export function useLossComparison(projectId: number) {
  return useQuery({
    queryKey: ['project', projectId, 'dashboard', 'loss-comparison'],
    queryFn: () => evaluationApi.getLossComparison(projectId),
  })
}
export function useLossCurveComparison(projectId: number) {
  return useQuery({
    queryKey: ['project', projectId, 'dashboard', 'loss-curve-comparison'],
    queryFn: () => evaluationApi.getLossCurveComparison(projectId),
  })
}



export function useGeneralizationGapComparisons(projectId: number, metrics: Metric[]) {
  return useQueries({
    queries: metrics.map((metric) => ({
      queryKey: ['project', projectId, 'dashboard', 'gap-comparison', metric],
      queryFn: () => evaluationApi.getGeneralizationGapComparison(projectId, metric),
    })),
  })
}