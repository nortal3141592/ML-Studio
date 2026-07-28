import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useResetPassword } from '../../lib/hooks/useAuth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [newPassword, setNewPassword] = useState('')
  const resetPassword = useResetPassword()
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    resetPassword.mutate(
      { token, new_password: newPassword },
      { onSuccess: () => navigate('/login', { replace: true }) }
    )
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-text">This reset link is missing or invalid.</p>
          <Link to="/forgot-password" className="text-xs text-accent hover:text-accent-hover">Request a new link</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-lg font-medium text-text">Set a new password</h1>
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={8}
          helperText="At least 8 characters"
          required
        />
        <Button type="submit" disabled={resetPassword.isPending}>
          {resetPassword.isPending ? 'Resetting...' : 'Reset password'}
        </Button>
        {resetPassword.isError && <p className="text-xs text-error">{resetPassword.error.message}</p>}
      </form>
    </div>
  )
}