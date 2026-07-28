import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjectMetadata, useProjectRows, useCleanDataset } from '../../lib/hooks/useProjects'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { StageNotReady } from '../../components/StageNotReady'
import { ApiError } from '../../lib/api/client'
import { useToast } from '../../lib/ToastContext'

export function CleanedPreviewPage() {
  const { projectId } = useParams()
  const id = Number(projectId)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const { data: rawMetadata } = useProjectMetadata(id, 'raw')
  const { data: metadata, isLoading: metaLoading, error } = useProjectMetadata(id, 'cleaned')
  const { data: rowsData, isLoading: rowsLoading } = useProjectRows(id, 'cleaned')
  const cleanDataset = useCleanDataset(id)

  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())

  const notReady = error instanceof ApiError && error.status === 404

  function toggleColumn(col: string) {
    setSelectedColumns((prev) => {
      const next = new Set(prev)
      next.has(col) ? next.delete(col) : next.add(col)
      return next
    })
  }

  function handleClean() {
    cleanDataset.mutate(
      { droppable_columns: Array.from(selectedColumns) },
      { onSuccess: () => showToast('Dataset cleaned', 'success') }
    )
  }

  if (metaLoading || rowsLoading) {
    return <p className="text-sm text-text-muted">Loading...</p>
  }

  // not-ready case: show the column-selection form using RAW metadata, since cleaned doesn't exist yet
  if (notReady) {
    if (!rawMetadata) {
      return (
        <StageNotReady
          message="Raw data isn't available for this project yet."
          actionLabel="Back to projects"
          actionTo="/"
        />
      )
    }
    return (
      <Card>
        <CardHeader><CardTitle>Choose columns to drop</CardTitle></CardHeader>
        <p className="mb-3 text-sm text-text-muted">
          Select any columns you don't want included in training (IDs, duplicates, irrelevant fields). You can leave none selected.
        </p>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {rawMetadata.column_names.map((col) => (
            <label key={col} className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={selectedColumns.has(col)}
                onChange={() => toggleColumn(col)}
                className="accent-accent"
              />
              <span className="font-mono text-xs">{col}</span>
            </label>
          ))}
        </div>
        <Button onClick={handleClean} disabled={cleanDataset.isPending}>
          {cleanDataset.isPending ? 'Cleaning...' : 'Clean dataset'}
        </Button>
        {cleanDataset.isError && <p className="mt-2 text-xs text-error">{cleanDataset.error.message}</p>}
      </Card>
    )
  }

  if (!metadata) return null

  const rows = rowsData?.rows ?? []
  const columns: Column<Record<string, unknown>>[] =
    rows.length > 0
      ? Object.keys(rows[0]).map((key) => ({
          key,
          label: key,
          render: (row) => <span className="font-mono text-xs">{String(row[key] ?? '—')}</span>,
        }))
      : []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          Cleaned: {metadata.rows.toLocaleString()} rows × {metadata.columns} columns
        </p>
        <Button variant="secondary" size="sm" onClick={() => navigate(`/projects/${id}/engineered`)}>
          Continue to feature engineering
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Cleaned preview</CardTitle></CardHeader>
        <div className="overflow-x-auto">
            <Table columns={columns} data={rows.map((row, i) => ({ ...row, __rowIndex: i }))} rowKey={(row) => String(row.__rowIndex)} />
        </div>
      </Card>
      {metadata.cleaning_summary && (
  <Card>
    <CardHeader><CardTitle>Cleaning summary</CardTitle></CardHeader>
    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <div>
        <p className="text-xs text-text-muted">Rows</p>
        <p className="font-mono text-text">{metadata.cleaning_summary.rows_before} → {metadata.cleaning_summary.rows_after}</p>
      </div>
      <div>
        <p className="text-xs text-text-muted">Columns</p>
        <p className="font-mono text-text">{metadata.cleaning_summary.columns_before} → {metadata.cleaning_summary.columns_after}</p>
      </div>
      <div>
        <p className="text-xs text-text-muted">Duplicates removed</p>
        <p className="font-mono text-text">{metadata.cleaning_summary.duplicate_rows_removed}</p>
      </div>
    </div>
    {(metadata.cleaning_summary.removed_constant_columns.length > 0 ||
      metadata.cleaning_summary.removed_sparse_columns.length > 0 ||
      metadata.cleaning_summary.removed_all_null_columns.length > 0) && (
      <div className="mt-3 flex flex-col gap-1 text-xs text-text-muted">
        {metadata.cleaning_summary.removed_constant_columns.length > 0 && (
          <p>Removed constant columns: <span className="font-mono text-text">{metadata.cleaning_summary.removed_constant_columns.join(', ')}</span></p>
        )}
        {metadata.cleaning_summary.removed_sparse_columns.length > 0 && (
          <p>Removed sparse columns: <span className="font-mono text-text">{metadata.cleaning_summary.removed_sparse_columns.join(', ')}</span></p>
        )}
        {metadata.cleaning_summary.removed_all_null_columns.length > 0 && (
          <p>Removed all-null columns: <span className="font-mono text-text">{metadata.cleaning_summary.removed_all_null_columns.join(', ')}</span></p>
        )}
      </div>
    )}
  </Card>
)}
    </div>
  )
}