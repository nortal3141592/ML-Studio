import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import { useLogin } from '../../lib/hooks/useAuth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    login.mutate(
      { email, password },
      { onSuccess: () => navigate(from, { replace: true }) }
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <div>
          <h1 className="text-lg font-medium text-text">Log in to ML Studio</h1>
          <p className="mt-1 text-sm text-text-muted">Pick up where you left off.</p>
        </div>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? 'Logging in...' : 'Log in'}
        </Button>
        {login.isError && <p className="text-xs text-error">{login.error.message}</p>}
        <div className="flex justify-between text-xs text-text-muted">
          <Link to="/register" className="hover:text-text">Create an account</Link>
          <Link to="/forgot-password" className="hover:text-text">Forgot password?</Link>
        </div>
      </form>
    </div>
  )
}