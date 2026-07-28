import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjects, useUploadProject, useDeleteProject } from '../lib/hooks/useProjects'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { FileInput } from '../components/ui/FileInput'
import { useToast } from '../lib/ToastContext'
import type { ProjectStatus } from '../lib/api/types/projects'

const statusStyles: Record<ProjectStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  uploaded: 'neutral',
  cleaning: 'warning',
  ready: 'success',
  training: 'warning',
  completed: 'success',
  failed: 'error',
}

function statusBadge(status: ProjectStatus) {
  return <Badge status={statusStyles[status]}>{status}</Badge>
}

export function ProjectsPage() {
  const { data: projects, isLoading } = useProjects()
  const upload = useUploadProject()
  const deleteProject = useDeleteProject()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  function handleUpload() {
    if (!file || !name) return
    upload.mutate(
      { name, file },
      {
        onSuccess: (project) => {
          setUploadOpen(false)
          setName('')
          setFile(null)
          showToast('Project created', 'success')
          navigate(`/projects/${project.id}`)
        },
      }
    )
  }

  function handleConfirmDelete() {
    if (pendingDeleteId === null) return
    deleteProject.mutate(pendingDeleteId, {
      onSuccess: () => {
        showToast('Project deleted', 'success')
        setPendingDeleteId(null)
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium text-text">Projects</h1>
        <Button onClick={() => setUploadOpen(true)}>New project</Button>
      </div>

      {isLoading && <p className="text-sm text-text-muted">Loading projects...</p>}

      {!isLoading && projects?.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-sm text-text">No projects yet</p>
          <p className="text-sm text-text-muted">Upload a CSV to start your first pipeline.</p>
          <Button className="mt-2" onClick={() => setUploadOpen(true)}>New project</Button>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <Card
            key={project.id}
            className="flex cursor-pointer flex-col gap-3 transition-colors hover:border-border-strong"
            onClick={() => navigate(`/projects/${project.id}/raw`)}
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-text">{project.project_name}</p>
              {statusBadge(project.status)}
            </div>
            <p className="font-mono text-xs text-text-muted">
              {new Date(project.created_at).toLocaleDateString()}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="self-start text-error hover:text-error"
              onClick={(e) => {
                e.stopPropagation() // don't trigger the card's own onClick navigation
                setPendingDeleteId(project.id)
              }}
            >
              Delete
            </Button>
          </Card>
        ))}
      </div>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="New project">
        <div className="flex flex-col gap-4">
          <Input label="Project name" value={name} onChange={(e) => setName(e.target.value)} />
          <FileInput label="Dataset" accept=".csv" onFileSelect={setFile} />
          {upload.isError && <p className="text-xs text-error">{upload.error.message}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!file || !name || upload.isPending}>
              {upload.isPending ? 'Uploading...' : 'Create project'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={pendingDeleteId !== null} onClose={() => setPendingDeleteId(null)} title="Delete project?">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            This permanently deletes the project and all its runs. This can't be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteProject.isPending}>
              {deleteProject.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}