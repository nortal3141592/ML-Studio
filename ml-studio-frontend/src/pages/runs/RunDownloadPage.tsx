import { useParams } from 'react-router-dom'
import { useTrainingRunStatus } from '../../lib/hooks/useTraining'
import { useDownloadBundle, useDownloadModel, useDownloadPreprocessor } from '../../lib/hooks/useDownloads'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../lib/ToastContext'

export function RunDownloadPage() {
  const { projectId, runId } = useParams()
  const id = Number(projectId)
  const rId = Number(runId)
  const { data: run, isLoading } = useTrainingRunStatus(id, rId)
  const { showToast } = useToast()

  const downloadBundle = useDownloadBundle(id)
  const downloadModel = useDownloadModel(id)
  const downloadPreprocessor = useDownloadPreprocessor(id)

  if (isLoading) return <p className="text-sm text-text-muted">Loading...</p>
  if (!run) return null

  if (run.status !== 'COMPLETED') {
    return (
      <Card className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm text-text">Nothing to download yet.</p>
        <p className="text-sm text-text-muted">This run is still {run.status.toLowerCase()} — downloads unlock once training completes.</p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <div>
          <p className="text-sm font-medium text-text">Everything you need to run this model</p>
          <p className="mt-1 text-sm text-text-muted">
            One zip containing the trained model, the fitted preprocessor, and this run's metrics.
          </p>
        </div>
        <Button
          onClick={() => downloadBundle.mutate(rId, {
            onSuccess: () => showToast('Bundle downloaded', 'success'),
            onError: () => showToast('Download failed', 'error'),
          })}
          disabled={downloadBundle.isPending}
        >
          {downloadBundle.isPending ? 'Preparing download...' : 'Download run bundle'}
        </Button>
        {downloadBundle.isError && <p className="text-xs text-error">{downloadBundle.error.message}</p>}
      </Card>

      <Card>
        <CardHeader><CardTitle>Download individually</CardTitle></CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 flex-col gap-2 rounded-lg border border-border p-4">
            <p className="text-sm text-text">Model file</p>
            <p className="text-xs text-text-muted">The trained model for this specific run.</p>
            <Button
              variant="secondary" size="sm" className="mt-1 self-start"
              onClick={() => downloadModel.mutate(rId, {
                onSuccess: () => showToast('Model downloaded', 'success'),
                onError: () => showToast('Download failed', 'error'),
              })}
              disabled={downloadModel.isPending}
            >
              {downloadModel.isPending ? 'Downloading...' : 'Download model'}
            </Button>
          </div>
          <div className="flex flex-1 flex-col gap-2 rounded-lg border border-border p-4">
            <p className="text-sm text-text">Preprocessor</p>
            <p className="text-xs text-text-muted">Shared across all runs in this project — needed to transform new raw input before prediction.</p>
            <Button
              variant="secondary" size="sm" className="mt-1 self-start"
              onClick={() => downloadPreprocessor.mutate(undefined, {
                onSuccess: () => showToast('Preprocessor downloaded', 'success'),
                onError: () => showToast('Download failed', 'error'),
              })}
              disabled={downloadPreprocessor.isPending}
            >
              {downloadPreprocessor.isPending ? 'Downloading...' : 'Download preprocessor'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}