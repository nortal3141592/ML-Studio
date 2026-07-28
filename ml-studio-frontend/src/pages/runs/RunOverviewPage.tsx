import { useParams, NavLink, Outlet, Link } from 'react-router-dom'
import { useTrainingRunStatus } from '../../lib/hooks/useTraining'
import { algorithmLabels } from '../../lib/hyperparameterDefaults'
import type { Algorithm } from '../../lib/api/types/training'

const tabs = [
  { to: 'details', label: 'Run details' },
  { to: 'metrics', label: 'Run metrics' },
  { to: 'evaluation', label: 'Run evaluation' },
  { to: 'download', label: 'Download' },
]

export function RunOverviewPage() {
  const { projectId, runId } = useParams()
  const id = Number(projectId)
  const rId = Number(runId)
  const { data: run } = useTrainingRunStatus(id, rId)
  const algoLabel = run ? (algorithmLabels[run.algorithm as Algorithm] ?? run.algorithm) : '...'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to={`/projects/${id}/training`} className="text-xs text-text-muted hover:text-text">
          ← Back to training
        </Link>
        <p className="mt-2 font-mono text-xs text-text-muted">Run #{rId}</p>
        <h1 className="text-lg font-medium text-text">{algoLabel}</h1>
      </div>
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={`/projects/${id}/runs/${rId}/${tab.to}`}
            className={({ isActive }) =>
              `border-b-2 px-3 py-2 text-sm transition-colors ${
                isActive ? 'border-accent text-text' : 'border-transparent text-text-muted hover:text-text'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}