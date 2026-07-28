import { useParams } from 'react-router-dom'
import { useTrainingRunStatus } from '../../lib/hooks/useTraining'

import { isClassificationMetrics } from '../../lib/api/types/evaluation'

import {
    useRunMetrics,
  useBarCharts, useGeneralizationGaps, useInsights,
  useLossCurve, useFeatureImportance, useCoefficients,
} from '../../lib/hooks/useEvaluation'
import { REGRESSION_METRICS, CLASSIFICATION_METRICS } from '../../lib/metricSets'
import { TREE_BASED_ALGORITHMS, LINEAR_ALGORITHMS } from '../../lib/algorithmCategories'
import type { Algorithm } from '../../lib/api/types/training'
import type { InsightSeverity } from '../../lib/api/types/evaluation'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Table, type Column } from '../../components/ui/Table'
import { TrainCvTestBarChart } from '../../components/charts/TrainCvTestBarChart'
import { HorizontalBarChart } from '../../components/charts/HorizontalBarChart'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const severityToBadge: Record<InsightSeverity, 'success' | 'info' | 'warning' | 'error'> = {
  success: 'success', info: 'info', warning: 'warning', error: 'error',
}
const severityBorder: Record<InsightSeverity, string> = {
  success: 'border-l-success', info: 'border-l-accent', warning: 'border-l-warning', error: 'border-l-error',
}

interface GapRow { metric: string; train: number; cv: number; gap: number }
const gapColumns: Column<GapRow>[] = [
  { key: 'metric', label: 'Metric', render: (r) => <span className="capitalize">{r.metric}</span> },
  { key: 'train', label: 'Train', render: (r) => <span className="font-mono">{r.train.toFixed(4)}</span> },
  { key: 'cv', label: 'CV', render: (r) => <span className="font-mono">{r.cv.toFixed(4)}</span> },
  { key: 'gap', label: 'Gap', render: (r) => <span className="font-mono">{r.gap.toFixed(4)}</span> },
]

export function RunEvaluationPage() {
  const { projectId, runId } = useParams()
  const id = Number(projectId)
  const rId = Number(runId)

  const { data: run } = useTrainingRunStatus(id, rId)
  const { data: metrics } = useRunMetrics(id, rId)
  const isClassification = metrics ? isClassificationMetrics(metrics) : null
  const applicableMetrics = isClassification === null ? [] : isClassification ? CLASSIFICATION_METRICS : REGRESSION_METRICS

  const barCharts = useBarCharts(id, rId, applicableMetrics)
  const gapsQuery = useGeneralizationGaps(id, rId)
  const insightsQuery = useInsights(id, rId)

  const isNeuralNetwork = run?.algorithm === 'neural_network'
  const isTreeBased = TREE_BASED_ALGORITHMS.includes(run?.algorithm as Algorithm)
  const isLinear = LINEAR_ALGORITHMS.includes(run?.algorithm as Algorithm)

  const lossCurveQuery = useLossCurve(id, rId, isNeuralNetwork)
  const featureImportanceQuery = useFeatureImportance(id, rId, isTreeBased)
  const coefficientsQuery = useCoefficients(id, rId, isLinear)

  if (!run || !metrics) return <p className="text-sm text-text-muted">Loading evaluation...</p>

  const gapRows: GapRow[] = gapsQuery.data
    ? Object.entries(gapsQuery.data).map(([metric, { train, cv, gap }]) => ({ metric, train, cv, gap }))
    : []

  const lossCurveData = lossCurveQuery.data
    ? lossCurveQuery.data.epochs.map((epoch, i) => ({
        epoch,
        train_loss: lossCurveQuery.data!.train_loss[i],
        cv_loss: lossCurveQuery.data!.cv_loss[i],
      }))
    : []

  const importanceData = featureImportanceQuery.data
    ? [...featureImportanceQuery.data.features]
        .sort((a, b) => b.importance - a.importance)
        .map((f) => ({ label: f.feature, value: f.importance }))
    : []

  const coefficientData = coefficientsQuery.data
    ? [...coefficientsQuery.data.features]
        .sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))
        .map((f) => ({ label: f.feature, value: f.coefficient }))
    : []

  return (
    <div className="flex flex-col gap-6">
      {/* Insights lead the page — plain-language takeaways before the raw numbers */}
      <Card>
        <CardHeader><CardTitle>Insights</CardTitle></CardHeader>
        {insightsQuery.isLoading ? (
          <p className="text-sm text-text-muted">Loading insights...</p>
        ) : (
          <div className="flex flex-col gap-3">
            {insightsQuery.data?.map((insight, i) => (
              <div key={i} className={`border-l-4 ${severityBorder[insight.severity]} rounded-r-md bg-surface-hover py-2 pl-3`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text">{insight.title}</p>
                  <Badge status={severityToBadge[insight.severity]}>{insight.severity}</Badge>
                </div>
                <p className="mt-1 text-xs text-text-muted">{insight.description}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle>Metric comparison</CardTitle></CardHeader>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {barCharts.map((result, i) => (
            result.data ? (
              <TrainCvTestBarChart
                key={applicableMetrics[i]}
                title={applicableMetrics[i]}
                train={result.data.train}
                cv={result.data.cv}
                test={result.data.test}
                higherIsBetter={result.data.higher_is_better}
              />
            ) : (
              <p key={applicableMetrics[i]} className="text-sm text-text-muted">Loading {applicableMetrics[i]}...</p>
            )
          ))}
        </div>
      </Card>

     <Card>
  <CardHeader>
    <CardTitle>Generalization gap</CardTitle>
  </CardHeader>

  {gapsQuery.isLoading ? (
    <p className="text-sm text-text-muted">Loading...</p>
  ) : (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {Object.entries(gapsQuery.data!).map(([metric, values]) => (
          <TrainCvTestBarChart
    title={metric}
    train={values.train}
    cv={values.cv}
    test={values.gap}
    labels={['Train', 'CV', 'Gap']}
    higherIsBetter={false}
/>
        ))}
      </div>

      <div className="mt-6">
        <Table
          columns={gapColumns}
          data={gapRows}
          rowKey={(r) => r.metric}
        />
      </div>
    </>
  )}
</Card>

      <Card>
        <CardHeader><CardTitle>Loss curve</CardTitle></CardHeader>
        {!isNeuralNetwork ? (
          <p className="text-sm text-text-muted">Not applicable — this run used {run.algorithm}, not a neural network.</p>
        ) : lossCurveQuery.isLoading ? (
          <p className="text-sm text-text-muted">Loading...</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lossCurveData}>
              <CartesianGrid stroke="var(--color-border)" />
              <XAxis dataKey="epoch" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--color-text)' }}
              />
              <Line type="monotone" dataKey="train_loss" stroke="var(--color-accent)" strokeWidth={2} dot={false} name="Train loss" />
              <Line type="monotone" dataKey="cv_loss" stroke="var(--color-text-muted)" strokeWidth={2} dot={false} name="CV loss" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle>Feature importance</CardTitle></CardHeader>
        {!isTreeBased ? (
          <p className="text-sm text-text-muted">Not applicable — this run used {run.algorithm}, not a tree-based algorithm.</p>
        ) : featureImportanceQuery.isLoading ? (
          <p className="text-sm text-text-muted">Loading...</p>
        ) : (
          <HorizontalBarChart data={importanceData} />
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle>Coefficients</CardTitle></CardHeader>
        {!isLinear ? (
          <p className="text-sm text-text-muted">Not applicable — this run used {run.algorithm}, not a linear model.</p>
        ) : coefficientsQuery.isLoading ? (
          <p className="text-sm text-text-muted">Loading...</p>
        ) : (
          <HorizontalBarChart data={coefficientData} />
        )}
      </Card>
    </div>
  )
}