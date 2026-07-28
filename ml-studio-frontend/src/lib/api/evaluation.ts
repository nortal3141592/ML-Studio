import { apiFetch } from './client'
import type { RunMetrics, LeaderBoardResponse, MultiModelComparisonResponse, MultiRunLossResponse, MultiRunLossCurveResponse } from './types/evaluation'

import type {
  Metric, MetricComparisonResponse, GeneralizationGapsResponse,
  InsightResponse, LossCurveResponse, FeatureImportanceResponse, FeatureCoefficientResponse,
} from './types/evaluation'

export function getBarChartData(projectId: number, runId: number, metric: Metric): Promise<MetricComparisonResponse> {
  return apiFetch(`/api/projects/${projectId}/runs/${runId}/bar-chart?metric=${metric}`)
}
export function getGeneralizationGaps(projectId: number, runId: number): Promise<GeneralizationGapsResponse> {
  return apiFetch(`/api/projects/${projectId}/runs/${runId}/generalization-gaps`)
}
export function getInsights(projectId: number, runId: number): Promise<InsightResponse[]> {
  return apiFetch(`/api/projects/${projectId}/runs/${runId}/insights`)
}
export function getLossCurve(projectId: number, runId: number): Promise<LossCurveResponse> {
  return apiFetch(`/api/projects/${projectId}/runs/${runId}/loss-curve`)
}
export function getFeatureImportance(projectId: number, runId: number): Promise<FeatureImportanceResponse> {
  return apiFetch(`/api/projects/${projectId}/runs/${runId}/feature-importance`)
}
export function getCoefficients(projectId: number, runId: number): Promise<FeatureCoefficientResponse> {
  return apiFetch(`/api/projects/${projectId}/runs/${runId}/coefficients`)
}

export function getRunMetrics(projectId: number, runId: number): Promise<RunMetrics> {
  return apiFetch<RunMetrics>(`/api/projects/${projectId}/runs/${runId}/metrics`)
}

export function getLeaderboard(projectId: number, sortBy: Metric): Promise<LeaderBoardResponse> {
  return apiFetch(`/api/projects/${projectId}/dashboard/leaderboard?sort_by=${sortBy}`)
}
export function getMetricComparison(projectId: number, metric: Metric): Promise<MultiModelComparisonResponse> {
  return apiFetch(`/api/projects/${projectId}/dashboard/metric-comparison?metric=${metric}`)
}
export function getGeneralizationGapComparison(projectId: number, metric: Metric): Promise<MultiModelComparisonResponse> {
  return apiFetch(`/api/projects/${projectId}/dashboard/generalization-gap-comparison?metric=${metric}`)
}
export function getLossComparison(projectId: number): Promise<MultiRunLossResponse> {
  return apiFetch(`/api/projects/${projectId}/dashboard/loss-comparison`)
}
export function getLossCurveComparison(projectId: number): Promise<MultiRunLossCurveResponse> {
  return apiFetch(`/api/projects/${projectId}/dashboard/loss-curve-comparison`)
}

