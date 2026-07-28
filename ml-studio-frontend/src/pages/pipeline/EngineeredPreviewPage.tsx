import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjectMetadata, useEngineeredMetadata, useProjectRows } from '../../lib/hooks/useProjects'
import { useEngineerFeatures } from '../../lib/hooks/useTraining'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ApiError } from '../../lib/api/client'
import { useToast } from '../../lib/ToastContext'
import type { DatasetSplit } from '../../lib/api/types/projects'

function RowsTable({ rows }: { rows: Record<string, unknown>[] | null | undefined }) {
  if (!rows || rows.length === 0) return <p className="text-sm text-text-muted">No rows</p>
  const columns: Column<Record<string, unknown>>[] = Object.keys(rows[0]).map((key) => ({
    key,
    label: key,
    render: (row) => <span className="font-mono text-xs">{String(row[key] ?? '—')}</span>,
  }))
  return (
    <div className="overflow-x-auto">
      <Table columns={columns} data={rows.map((row, i) => ({ ...row, __rowIndex: i }))} rowKey={(row) => String(row.__rowIndex)} />
    </div>
  )
}

export function EngineeredPreviewPage() {
  const { projectId } = useParams()
  const id = Number(projectId)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const { data: cleanedMetadata } = useProjectMetadata(id, 'cleaned')
  const { data: metadata, isLoading: metaLoading, error } = useEngineeredMetadata(id)
  const engineerFeatures = useEngineerFeatures(id)

  const [targetColumn, setTargetColumn] = useState('')
  const [trainSplit, setTrainSplit] = useState(70)
  const [cvSplit, setCvSplit] = useState(15)
  const [testSplit, setTestSplit] = useState(15)
  const [activeSplit, setActiveSplit] = useState<DatasetSplit>('train')

  const { data: rowsData, isLoading: rowsLoading } = useProjectRows(id, 'engineered', activeSplit)

  const notReady = error instanceof ApiError && error.status === 404
  const splitsSumTo100 = trainSplit + cvSplit + testSplit === 100

  function handleEngineer() {
    if (!targetColumn || !splitsSumTo100) return
    engineerFeatures.mutate(
      { target_column: targetColumn, train_split: trainSplit, cv_split: cvSplit, test_split: testSplit },
      { onSuccess: () => showToast('Features engineered', 'success') }
    )
  }

  if (metaLoading) {
    return <p className="text-sm text-text-muted">Loading...</p>
  }

  if (notReady) {
    if (!cleanedMetadata) {
      return <p className="text-sm text-text-muted">Finish the cleaning step first to continue here.</p>
    }
    return (
      <Card className="max-w-md">
        <CardHeader><CardTitle>Configure feature engineering</CardTitle></CardHeader>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm text-text-muted">Target column</label>
            <select
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="">Select a column...</option>
              {cleanedMetadata.column_names.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Train %" type="number" value={trainSplit} onChange={(e) => setTrainSplit(Number(e.target.value))} />
            <Input label="CV %" type="number" value={cvSplit} onChange={(e) => setCvSplit(Number(e.target.value))} />
            <Input label="Test %" type="number" value={testSplit} onChange={(e) => setTestSplit(Number(e.target.value))} />
          </div>
          {!splitsSumTo100 && (
            <p className="text-xs text-error">Splits must add up to 100 (currently {trainSplit + cvSplit + testSplit})</p>
          )}
          <Button onClick={handleEngineer} disabled={!targetColumn || !splitsSumTo100 || engineerFeatures.isPending}>
            {engineerFeatures.isPending ? 'Engineering...' : 'Run feature engineering'}
          </Button>
          {engineerFeatures.isError && <p className="text-xs text-error">{engineerFeatures.error.message}</p>}
        </div>
      </Card>
    )
  }

  if (!metadata) return null

  const splitCards: { label: string; data: typeof metadata.train }[] = [
    { label: 'Train', data: metadata.train },
    { label: 'CV', data: metadata.cv },
    { label: 'Test', data: metadata.test },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          Target: <span className="font-mono text-text">{metadata.target_column}</span>
          {' · '}{metadata.number_of_features_after_encoding} features after encoding
        </p>
        <Button variant="secondary" size="sm" onClick={() => navigate(`/projects/${id}/training`)}>
          Continue to training
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {splitCards.map(({ label, data }) => (
          <Card key={label}>
            <p className="text-xs text-text-muted">{label}</p>
            <p className="font-mono text-lg text-text">{data.x_rows.toLocaleString()} rows</p>
            <p className="font-mono text-xs text-text-muted">{data.x_columns} features</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Encoding & scaling</CardTitle></CardHeader>
        <div className="flex flex-col gap-2 text-xs text-text-muted">
          {metadata.scaled_columns.length > 0 && (
            <p>Scaled: <span className="font-mono text-text">{metadata.scaled_columns.join(', ')}</span></p>
          )}
          {metadata.encoded_columns.length > 0 && (
            <p>Encoded: <span className="font-mono text-text">{metadata.encoded_columns.join(', ')}</span></p>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex gap-1">
          {(['train', 'cv', 'test'] as DatasetSplit[]).map((split) => (
            <button
              key={split}
              onClick={() => setActiveSplit(split)}
              className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
                activeSplit === split ? 'bg-surface-hover text-text' : 'text-text-muted hover:text-text'
              }`}
            >
              {split}
            </button>
          ))}
        </div>
        {rowsLoading ? (
          <p className="text-sm text-text-muted">Loading rows...</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-xs text-text-muted">Features (X)</p>
              <RowsTable rows={rowsData?.x_rows} />
            </div>
            <div>
              <p className="mb-2 text-xs text-text-muted">Target (y)</p>
              <RowsTable rows={rowsData?.y_rows} />
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}