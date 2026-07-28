import { useParams } from 'react-router-dom'
import { useTrainingRunStatus } from '../../lib/hooks/useTraining'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'

const statusToBadge: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  QUEUED: 'neutral', INITIALIZING: 'warning', TRAINING: 'warning',
  SAVING_MODEL: 'warning', COMPLETED: 'success', FAILED: 'error', CANCELLED: 'error',
}

function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'None'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return JSON.stringify(value)
  return String(value)
}
function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
}

export function RunDetailsPage() {
  const { projectId, runId } = useParams()
  const { data: run, isLoading } = useTrainingRunStatus(Number(projectId), Number(runId))

  if (isLoading) return <p className="text-sm text-text-muted">Loading run...</p>
  if (!run) return null

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div><p className="text-xs text-text-muted">Status</p><Badge status={statusToBadge[run.status] ?? 'neutral'}>{run.status}</Badge></div>
          <div><p className="text-xs text-text-muted">Random seed</p><p className="font-mono text-sm text-text">{run.random_seed}</p></div>
          <div><p className="text-xs text-text-muted">Training time</p><p className="font-mono text-sm text-text">{formatDuration(run.training_time_seconds)}</p></div>
          <div><p className="text-xs text-text-muted">Progress</p><p className="font-mono text-sm text-text">{run.progress}%</p></div>
          <div><p className="text-xs text-text-muted">Created</p><p className="font-mono text-sm text-text">{new Date(run.created_at).toLocaleString()}</p></div>
          <div><p className="text-xs text-text-muted">Updated</p><p className="font-mono text-sm text-text">{new Date(run.updated_at).toLocaleString()}</p></div>
        </div>
        {run.error_message && <p className="mt-3 text-xs text-error">{run.error_message}</p>}
      </Card>

      <Card>
        <CardHeader><CardTitle>Hyperparameters</CardTitle></CardHeader>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.entries(run.hyperparameters).map(([key, value]) => (
            <div key={key}>
              <p className="text-xs text-text-muted">{formatKey(key)}</p>
              <p className="font-mono text-sm text-text">{formatValue(value)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}