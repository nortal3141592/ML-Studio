import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
// import { useTrainModel, useTrainingRunStatus } from '../../lib/hooks/useTraining'
import { hyperparameterDefaults, algorithmLabels } from '../../lib/hyperparameterDefaults'
import { hyperparameterFields } from '../../lib/hyperparameterFields'
import type { Algorithm, NeuralNetworkHyperparameters, Hyperparameters } from '../../lib/api/types/training'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { HyperparameterField } from '../../components/training/HyperparameterField'
import { NeuralNetworkFields } from '../../components/training/NeuralNetworkFields'
import { useToast } from '../../lib/ToastContext'
import { useTrainModel, useTrainingRunStatus, useProjectRuns } from '../../lib/hooks/useTraining'
import { RunCard } from '../../components/training/RunCard'

const algorithmOptions = (Object.keys(algorithmLabels) as Algorithm[]).map((a) => ({
  value: a,
  label: algorithmLabels[a],
}))

const statusToBadge: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  QUEUED: 'neutral',
  INITIALIZING: 'warning',
  TRAINING: 'warning',
  SAVING_MODEL: 'warning',
  COMPLETED: 'success',
  FAILED: 'error',
  CANCELLED: 'error',
}

export function TrainingPage() {
  const { projectId } = useParams()
  const id = Number(projectId)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [algorithm, setAlgorithm] = useState<Algorithm>('random_forest')
  const [hyperparameters, setHyperparameters] = useState<Hyperparameters>(hyperparameterDefaults.random_forest)
  const [activeRunId, setActiveRunId] = useState<number | null>(null)

  const trainModel = useTrainModel(id)
  const runStatus = useTrainingRunStatus(id, activeRunId ?? -1)

  const { data: runs, isLoading: runsLoading } = useProjectRuns(id)

  function handleAlgorithmChange(newAlgorithm: Algorithm) {
    setAlgorithm(newAlgorithm)
    setHyperparameters(hyperparameterDefaults[newAlgorithm])
  }

  function updateField(key: string, value: unknown) {
    setHyperparameters((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    trainModel.mutate(
      { algorithm, hyperparameters },
      {
        onSuccess: (res) => {
          setActiveRunId(res.run_id)
          showToast(`Training started — run #${res.run_id}`, 'success')
        },
      }
    )
  }

  const fields = algorithm === 'neural_network' ? null : hyperparameterFields[algorithm]
  const isRunning = activeRunId !== null && runStatus.data && !['COMPLETED', 'FAILED', 'CANCELLED'].includes(runStatus.data.status)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Configure training run</CardTitle></CardHeader>
          <div className="flex flex-col gap-4">
            <Select
              label="Algorithm"
              value={algorithm}
              onChange={(e) => handleAlgorithmChange(e.target.value as Algorithm)}
              options={algorithmOptions}
            />

            {algorithm === 'neural_network' ? (
              <NeuralNetworkFields
                value={hyperparameters as NeuralNetworkHyperparameters}
                onChange={(v) => setHyperparameters(v)}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {fields?.map((field) => (
                  <HyperparameterField
                    key={field.key}
                    field={field}
                    value={(hyperparameters as Record<string, unknown>)[field.key]}
                    onChange={(v) => updateField(field.key, v)}
                  />
                ))}
              </div>
            )}


            <Button onClick={handleSubmit} disabled={trainModel.isPending || isRunning}>
              {trainModel.isPending ? 'Starting...' : 'Start training'}
            </Button>
            {trainModel.isError && <p className="text-xs text-error">{trainModel.error.message}</p>}
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Run status</CardTitle></CardHeader>
          {activeRunId === null ? (
            <p className="text-sm text-text-muted">Start a training run to see its progress here.</p>
          ) : runStatus.isLoading ? (
            <p className="text-sm text-text-muted">Loading run status...</p>
          ) : runStatus.data ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm text-text">Run #{runStatus.data.id}</p>
                <Badge status={statusToBadge[runStatus.data.status] ?? 'neutral'}>{runStatus.data.status}</Badge>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${runStatus.data.progress}%` }}
                />
              </div>
              {runStatus.data.status_message && (
                <p className="text-xs text-text-muted">{runStatus.data.status_message}</p>
              )}
              {runStatus.data.status === 'FAILED' && runStatus.data.error_message && (
                <p className="text-xs text-error">{runStatus.data.error_message}</p>
              )}
              {runStatus.data.status === 'COMPLETED' && (
                <Button size="sm" onClick={() => navigate(`/projects/${id}/dashboard`)}>
                  View results
                </Button>
              )}
            </div>
          ) : null}
        </Card>
      </div>
        <div>
        <h2 className="mb-3 text-sm font-medium text-text">All runs</h2>
        {runsLoading ? (
            <p className="text-sm text-text-muted">Loading runs...</p>
        ) : runs && runs.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {runs.map((run) => (
                <RunCard key={run.id} run={run} />
            ))}
            </div>
        ) : (
            <p className="text-sm text-text-muted">No runs yet — configure and start one above.</p>
        )}
        </div>

    </div>
  )
}