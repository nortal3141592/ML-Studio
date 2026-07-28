import { NavLink, Outlet } from 'react-router-dom'
import { useCurrentUser, useLogout } from '../../lib/hooks/useAuth'
import { Button } from '../ui/Button'

const navItems = [
  { to: '/', label: 'Projects' },
]

export function AppLayout() {
  const { data: user } = useCurrentUser()
  const logout = useLogout()

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex h-14 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-8">
          <span className="text-sm font-medium text-text">ML Studio</span>
          <nav className="flex gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-surface text-text'
                      : 'text-text-muted hover:text-text'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NavLink to="/account" className="text-sm text-text-muted hover:text-text">
            {user?.username}
          </NavLink>
          <Button variant="secondary" size="sm" onClick={logout}>
            Log out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}