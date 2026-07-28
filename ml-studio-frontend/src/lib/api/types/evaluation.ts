export interface ClassificationMetrics {
  train_loss: number; cv_loss: number; test_loss: number
  train_samples: number; cv_samples: number; test_samples: number
  train_accuracy: number; cv_accuracy: number; test_accuracy: number
  train_precision: number; cv_precision: number; test_precision: number
  train_recall: number; cv_recall: number; test_recall: number
  train_f1: number; cv_f1: number; test_f1: number
}
export interface RegressionMetrics {
  train_loss: number; cv_loss: number; test_loss: number
  train_samples: number; cv_samples: number; test_samples: number
  train_mae: number; cv_mae: number; test_mae: number
  train_rmse: number; cv_rmse: number; test_rmse: number
  train_r2: number; cv_r2: number; test_r2: number
}
export type RunMetrics = ClassificationMetrics | RegressionMetrics

export type Metric = 'loss' | 'mae' | 'rmse' | 'r2' | 'accuracy' | 'precision' | 'recall' | 'f1'

export interface MetricComparisonResponse {
  metric: string
  higher_is_better: boolean
  train: number
  cv: number
  test: number
}

export interface GeneralizationGapEntry {
  train: number
  cv: number
  gap: number
}
export type GeneralizationGapsResponse = Record<string, GeneralizationGapEntry>

export type InsightSeverity = 'success' | 'info' | 'warning' | 'error'
export interface InsightResponse {
  title: string
  description: string
  severity: InsightSeverity
}

export interface LossCurveResponse {
  epochs: number[]
  train_loss: number[]
  cv_loss: number[]
}

export interface FeatureImportance { feature: string; importance: number }
export interface FeatureImportanceResponse { features: FeatureImportance[] }

export interface FeatureCoefficient { feature: string; coefficient: number }
export interface FeatureCoefficientResponse { features: FeatureCoefficient[] }

export interface MultiModelComparisonEntry {
  run_id: number
  algorithm: string
  hyperparameters: Record<string, unknown>
  value: number
}
export interface MultiModelComparisonResponse {
  metric: string
  higher_is_better: boolean
  entries: MultiModelComparisonEntry[]
}

export interface MultiRunLossEntry {
  run_id: number
  algorithm: string
  hyperparameters: Record<string, unknown>
  train_loss: number
  cv_loss: number
  test_loss: number
}
export interface MultiRunLossResponse { entries: MultiRunLossEntry[] }

export interface RunLossCurve {
  run_id: number
  algorithm: string
  hyperparameters: Record<string, unknown>
  epochs: number[]
  train_loss: number[]
  cv_loss: number[]
}
export interface MultiRunLossCurveResponse { curves: RunLossCurve[] }

export interface LeaderBoardEntry {
  run_id: number
  algorithm: string
  hyperparameters: Record<string, unknown>
  metrics: ClassificationMetrics | RegressionMetrics
  training_time_seconds: number
}
export interface LeaderBoardResponse { entries: LeaderBoardEntry[] }

export function isClassificationMetrics(m: RunMetrics): m is ClassificationMetrics {
  return 'train_accuracy' in m
}