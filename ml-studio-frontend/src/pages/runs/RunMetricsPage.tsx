import { useParams } from 'react-router-dom'
import { useRunMetrics } from '../../lib/hooks/useEvaluation'
import { isClassificationMetrics } from '../../lib/api/types/evaluation'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { ApiError } from '../../lib/api/client'

interface MetricRow { label: string; train: number; cv: number; test: number }

const columns: Column<MetricRow>[] = [
  { key: 'label', label: 'Metric', render: (r) => r.label },
  { key: 'train', label: 'Train', render: (r) => <span className="font-mono">{r.train.toFixed(4)}</span> },
  { key: 'cv', label: 'CV', render: (r) => <span className="font-mono">{r.cv.toFixed(4)}</span> },
  { key: 'test', label: 'Test', render: (r) => <span className="font-mono">{r.test.toFixed(4)}</span> },
]

export function RunMetricsPage() {
  const { projectId, runId } = useParams()
  const { data: metrics, isLoading, error } = useRunMetrics(Number(projectId), Number(runId))

  if (isLoading) return <p className="text-sm text-text-muted">Loading metrics...</p>
  if (error instanceof ApiError) return <p className="text-sm text-text-muted">{error.detail}</p>
  if (!metrics) return null

  const rows: MetricRow[] = isClassificationMetrics(metrics)
    ? [
        { label: 'Loss', train: metrics.train_loss, cv: metrics.cv_loss, test: metrics.test_loss },
        { label: 'Accuracy', train: metrics.train_accuracy, cv: metrics.cv_accuracy, test: metrics.test_accuracy },
        { label: 'Precision', train: metrics.train_precision, cv: metrics.cv_precision, test: metrics.test_precision },
        { label: 'Recall', train: metrics.train_recall, cv: metrics.cv_recall, test: metrics.test_recall },
        { label: 'F1', train: metrics.train_f1, cv: metrics.cv_f1, test: metrics.test_f1 },
      ]
    : [
        { label: 'Loss', train: metrics.train_loss, cv: metrics.cv_loss, test: metrics.test_loss },
        { label: 'MAE', train: metrics.train_mae, cv: metrics.cv_mae, test: metrics.test_mae },
        { label: 'RMSE', train: metrics.train_rmse, cv: metrics.cv_rmse, test: metrics.test_rmse },
        { label: 'R²', train: metrics.train_r2, cv: metrics.cv_r2, test: metrics.test_r2 },
      ]

  return (
    <Card>
      <CardHeader><CardTitle>{isClassificationMetrics(metrics) ? 'Classification metrics' : 'Regression metrics'}</CardTitle></CardHeader>
      <Table columns={columns} data={rows} rowKey={(r) => r.label} />
      <p className="mt-3 text-xs text-text-muted">
        Samples — train: {metrics.train_samples.toLocaleString()}, cv: {metrics.cv_samples.toLocaleString()}, test: {metrics.test_samples.toLocaleString()}
      </p>
    </Card>
  )
}