import { useParams, useNavigate } from 'react-router-dom'
import { useProjectMetadata, useProjectRows } from '../../lib/hooks/useProjects'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { StageNotReady } from '../../components/StageNotReady'
import { ApiError } from '../../lib/api/client'

export function RawPreviewPage() {
  const { projectId } = useParams()
  const id = Number(projectId)
  const { data: metadata, isLoading: metaLoading, error } = useProjectMetadata(id, 'raw')
  const { data: rowsData, isLoading: rowsLoading } = useProjectRows(id, 'raw')

  if (metaLoading || rowsLoading) {
    return <p className="text-sm text-text-muted">Loading preview...</p>
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <StageNotReady
        message={error.detail}
        actionLabel="Back to projects"
        actionTo="/"
      />
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-text-muted">Rows</p>
          <p className="font-mono text-xl text-text">{metadata.rows.toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted">Columns</p>
          <p className="font-mono text-xl text-text">{metadata.columns}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted">Missing values</p>
          <p className="font-mono text-xl text-text">
            {Object.values(metadata.missing_values).reduce((a, b) => a + b, 0).toLocaleString()}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted">Memory</p>
          <p className="font-mono text-xl text-text">{(metadata.memory_bytes / 1024).toFixed(1)} KB</p>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Preview (first rows)</CardTitle></CardHeader>
        <div className="overflow-x-auto">
            <Table columns={columns} data={rows.map((row, i) => ({ ...row, __rowIndex: i }))} rowKey={(row) => String(row.__rowIndex)} />
        </div>
      </Card>
    </div>
  )
}