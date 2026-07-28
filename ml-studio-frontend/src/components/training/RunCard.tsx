import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { TrainingRunStatusResponse, Algorithm } from '../../lib/api/types/training'
import { algorithmLabels } from '../../lib/hyperparameterDefaults'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useDeleteRun } from '../../lib/hooks/useTraining'
import { useToast } from '../../lib/ToastContext'

const statusToBadge: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  QUEUED: 'neutral', INITIALIZING: 'warning', TRAINING: 'warning',
  SAVING_MODEL: 'warning', COMPLETED: 'success', FAILED: 'error', CANCELLED: 'error',
}
const TERMINAL = ['COMPLETED', 'FAILED', 'CANCELLED']

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'None'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return `${value.length} layer${value.length === 1 ? '' : 's'}`
  return String(value)
}

export function RunCard({ run }: { run: TrainingRunStatusResponse }) {
  const { projectId } = useParams()
  const id = Number(projectId)
  const navigate = useNavigate()
  const { showToast } = useToast()
  const deleteRun = useDeleteRun(id)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isActive = !TERMINAL.includes(run.status)
  const algoLabel = algorithmLabels[run.algorithm as Algorithm] ?? run.algorithm

  function handleDelete() {
    deleteRun.mutate(run.id, {
      onSuccess: () => { showToast(`Run #${run.id} deleted`, 'success'); setConfirmOpen(false) },
    })
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text">Run #{run.id} — {algoLabel}</p>
          <p className="font-mono text-xs text-text-muted">
            Created {new Date(run.created_at).toLocaleString()}
          </p>
          <p className="font-mono text-xs text-text-muted">
            Updated {new Date(run.updated_at).toLocaleString()}
          </p>
        </div>
        <Badge status={statusToBadge[run.status] ?? 'neutral'}>{run.status}</Badge>
      </div>

      {isActive && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${run.progress}%` }} />
        </div>
      )}

      {run.status_message && <p className="text-xs text-text-muted">{run.status_message}</p>}
      {run.status === 'FAILED' && run.error_message && <p className="text-xs text-error">{run.error_message}</p>}

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2 text-xs">
        {Object.entries(run.hyperparameters).slice(0, 6).map(([key, value]) => (
          <span key={key} className="text-text-muted">
            {key}: <span className="font-mono text-text">{formatValue(value)}</span>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => navigate(`/projects/${id}/runs/${run.id}/details`)}>
          View details
        </Button>
        <Button variant="ghost" size="sm" className="text-error hover:text-error" onClick={() => setConfirmOpen(true)}>
          Delete
        </Button>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete this run?">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">This permanently deletes run #{run.id} and its model file. This can't be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteRun.isPending}>
              {deleteRun.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}