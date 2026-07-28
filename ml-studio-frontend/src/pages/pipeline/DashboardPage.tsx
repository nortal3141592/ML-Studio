import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../../lib/hooks/useProjects'
import {
  useLeaderboard, useMetricComparisons, useGeneralizationGapComparisons,
  useLossComparison, useLossCurveComparison,
} from '../../lib/hooks/useEvaluation'
import { metricsForTaskType } from '../../lib/metricSets'
import { algorithmLabels } from '../../lib/hyperparameterDefaults'
import type { Algorithm } from '../../lib/api/types/training'
import type{Metric} from '../../lib/api/types/evaluation'
import type { LeaderBoardEntry } from '../../lib/api/types/evaluation'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { Table, type Column } from '../../components/ui/Table'
import { HorizontalBarChart } from '../../components/charts/HorizontalBarChart'
import { LossComparisonChart } from '../../components/charts/LossComparisonChart'
import { LossCurveComparisonChart } from '../../components/charts/LossCurveComparisonChart'

function runLabel(algorithm: string, runId: number): string {
  return `${algorithmLabels[algorithm as Algorithm] ?? algorithm} #${runId}`
}

export function DashboardPage() {
  const { projectId } = useParams()
  const id = Number(projectId)
  const navigate = useNavigate()
  const { data: project, isLoading: projectLoading } = useProject(id)

  const taskType = project?.task_type ?? null
  const applicableMetrics = taskType ? metricsForTaskType(taskType) : []

  const [sortBy, setSortBy] = useState<Metric | null>(null)
  const leaderboardMetric = sortBy ?? applicableMetrics[0] ?? 'loss'

  const leaderboard = useLeaderboard(id, leaderboardMetric)
  const metricComparisons = useMetricComparisons(id, applicableMetrics)
  const gapComparisons = useGeneralizationGapComparisons(id, applicableMetrics)
  const lossComparison = useLossComparison(id)
  const lossCurveComparison = useLossCurveComparison(id)

  if (projectLoading) return <p className="text-sm text-text-muted">Loading...</p>

  if (!taskType) {
    return (
      <Card className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm text-text">This project's task type hasn't been determined yet.</p>
        <p className="text-sm text-text-muted">Finish feature engineering (which sets the target column) to unlock the dashboard.</p>
      </Card>
    )
  }

  const leaderboardColumns: Column<LeaderBoardEntry>[] = [
    { key: 'run_id', label: 'Run', render: (r) => <span className="font-mono text-xs">#{r.run_id}</span> },
    { key: 'algorithm', label: 'Algorithm', render: (r) => algorithmLabels[r.algorithm as Algorithm] ?? r.algorithm },
    ...applicableMetrics.map((m) => ({
      key: m,
      label: m,
      className: 'capitalize',
      render: (r: LeaderBoardEntry) => {
        const value = (r.metrics as unknown as Record<string, number>)[`test_${m}`]
        return <span className="font-mono">{value.toFixed(4)}</span>
      },
    })),
    {
      key: 'training_time_seconds',
      label: 'Time',
      render: (r) => <span className="font-mono text-xs">{r.training_time_seconds.toFixed(1)}s</span>,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>Leaderboard</CardTitle>
          <div className="w-44">
            <Select
              label="Sort by"
              value={leaderboardMetric}
              onChange={(e) => setSortBy(e.target.value as Metric)}
              options={applicableMetrics.map((m) => ({ value: m, label: m }))}
            />
          </div>
        </div>
        {leaderboard.isLoading ? (
          <p className="text-sm text-text-muted">Loading...</p>
        ) : leaderboard.data && leaderboard.data.entries.length > 0 ? (
          <Table
            columns={leaderboardColumns}
            data={leaderboard.data.entries}
            rowKey={(r) => String(r.run_id)}
            onRowClick={(r) => navigate(`/projects/${id}/runs/${r.run_id}/details`)}
          />
        ) : (
          <p className="text-sm text-text-muted">No completed runs yet — start training to populate the leaderboard.</p>
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle>Metric comparison (test set)</CardTitle></CardHeader>
        <div className="flex flex-col gap-6">
          {metricComparisons.map((result, i) => (
            <div key={applicableMetrics[i]} className="rounded-lg border border-border p-4">
              <p className="mb-2 text-sm font-medium capitalize text-text">{applicableMetrics[i]}</p>
              {result.isLoading ? (
                <p className="text-sm text-text-muted">Loading...</p>
              ) : result.data && result.data.entries.length > 0 ? (
                <HorizontalBarChart
                  data={result.data.entries.map((e) => ({ label: runLabel(e.algorithm, e.run_id), value: e.value }))}
                />
              ) : (
                <p className="text-sm text-text-muted">No completed runs yet.</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Generalization gap</CardTitle></CardHeader>
        <div className="flex flex-col gap-6">
          {gapComparisons.map((result, i) => (
            <div key={applicableMetrics[i]} className="rounded-lg border border-border p-4">
              <p className="mb-2 text-sm font-medium capitalize text-text">{applicableMetrics[i]}</p>
              {result.isLoading ? (
                <p className="text-sm text-text-muted">Loading...</p>
              ) : result.data && result.data.entries.length > 0 ? (
                <HorizontalBarChart
                  data={result.data.entries.map((e) => ({ label: runLabel(e.algorithm, e.run_id), value: e.value }))}
                />
              ) : (
                <p className="text-sm text-text-muted">No completed runs yet.</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Loss comparison</CardTitle></CardHeader>
        {lossComparison.isLoading ? (
          <p className="text-sm text-text-muted">Loading...</p>
        ) : lossComparison.data && lossComparison.data.entries.length > 0 ? (
          <LossComparisonChart
            data={lossComparison.data.entries.map((e) => ({
              label: runLabel(e.algorithm, e.run_id),
              train_loss: e.train_loss,
              cv_loss: e.cv_loss,
              test_loss: e.test_loss,
            }))}
          />
        ) : (
          <p className="text-sm text-text-muted">No completed runs yet.</p>
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle>Loss curves (neural network runs)</CardTitle></CardHeader>
        {lossCurveComparison.isLoading ? (
          <p className="text-sm text-text-muted">Loading...</p>
        ) : lossCurveComparison.data && lossCurveComparison.data.curves.length > 0 ? (
          <LossCurveComparisonChart curves={lossCurveComparison.data.curves} />
        ) : (
          <p className="text-sm text-text-muted">No neural network runs in this project yet.</p>
        )}
      </Card>
    </div>
  )
}