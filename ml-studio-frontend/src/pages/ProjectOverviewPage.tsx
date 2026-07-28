import { useParams, NavLink, Outlet } from 'react-router-dom'
import { useProject } from '../lib/hooks/useProjects'

const stages = [
  { to: 'raw', label: 'Raw data' },
  { to: 'cleaned', label: 'Cleaning' },
  { to: 'engineered', label: 'Feature engineering' },
  { to: 'training', label: 'Training' },
  { to: 'dashboard', label: 'Dashboard' },
]

export function ProjectOverviewPage() {
  const { projectId } = useParams()
  const id = Number(projectId)
  const { data: project } = useProject(id)

  return (
    <div className="flex flex-col gap-6">
        {project && <h1 className="text-lg font-medium text-text">{project.project_name}</h1>}
      <div className="flex gap-1 border-b border-border">
        {stages.map((stage) => (
          <NavLink
            key={stage.to}
            to={`/projects/${projectId}/${stage.to}`}
            className={({ isActive }) =>
              `border-b-2 px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'border-accent text-text'
                  : 'border-transparent text-text-muted hover:text-text'
              }`
            }
          >
            {stage.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}