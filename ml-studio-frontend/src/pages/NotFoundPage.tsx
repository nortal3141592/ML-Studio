import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg text-center">
      <p className="text-lg font-medium text-text">Page not found</p>
      <p className="text-sm text-text-muted">The page you're looking for doesn't exist.</p>
      <Link to="/" className="text-sm text-accent hover:text-accent-hover">Back to projects</Link>
    </div>
  )
}