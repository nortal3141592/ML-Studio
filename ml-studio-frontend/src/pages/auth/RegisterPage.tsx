import { useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import { useRegister, useLogin } from '../../lib/hooks/useAuth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const register = useRegister()
  const login = useLogin()
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    register.mutate(
      { username, email, password },
      {
        // registration succeeded but doesn't return a token (check your schema: UserCreate -> UserPrivate,
        // no Token) — so we log in immediately after, rather than sending the user to a separate login screen
        // for credentials they just typed 10 seconds ago
        onSuccess: () => {
          login.mutate({ email, password }, { onSuccess: () => navigate('/', { replace: true }) })
        },
      }
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <div>
          <h1 className="text-lg font-medium text-text">Create your account</h1>
          <p className="mt-1 text-sm text-text-muted">Start building your first pipeline.</p>
        </div>
        <Input label="Username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          helperText="At least 8 characters"
          required
        />
        <Button type="submit" disabled={register.isPending || login.isPending}>
          {register.isPending || login.isPending ? 'Creating account...' : 'Create account'}
        </Button>
        {register.isError && <p className="text-xs text-error">{register.error.message}</p>}
        {login.isError && <p className="text-xs text-error">Account created, but login failed: {login.error.message}</p>}
        <p className="text-xs text-text-muted">
          Already have an account? <Link to="/login" className="hover:text-text">Log in</Link>
        </p>
      </form>
    </div>
  )
}