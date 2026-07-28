import type { Metric } from './api/types/evaluation'
import type { TaskType } from './api/types/projects'

export const REGRESSION_METRICS: Metric[] = ['loss', 'mae', 'rmse', 'r2']
export const CLASSIFICATION_METRICS: Metric[] = ['loss', 'accuracy', 'precision', 'recall', 'f1']

export function metricsForTaskType(taskType: TaskType): Metric[] {
  return taskType === 'regression' ? REGRESSION_METRICS : CLASSIFICATION_METRICS
}