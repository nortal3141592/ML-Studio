import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useForgotPassword } from '../../lib/hooks/useAuth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const forgotPassword = useForgotPassword()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    forgotPassword.mutate({ email })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="flex w-full max-w-sm flex-col gap-4">
        {forgotPassword.isSuccess ? (
          <>
            <h1 className="text-lg font-medium text-text">Check your email</h1>
            <p className="text-sm text-text-muted">
              If an account exists for {email}, we've sent a link to reset your password.
            </p>
            <Link to="/login" className="text-xs text-accent hover:text-accent-hover">Back to login</Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <h1 className="text-lg font-medium text-text">Reset your password</h1>
              <p className="mt-1 text-sm text-text-muted">We'll email you a link to get back in.</p>
            </div>
            <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit" disabled={forgotPassword.isPending}>
              {forgotPassword.isPending ? 'Sending...' : 'Send reset link'}
            </Button>
            {forgotPassword.isError && <p className="text-xs text-error">{forgotPassword.error.message}</p>}
            <Link to="/login" className="text-xs text-text-muted hover:text-text">Back to login</Link>
          </form>
        )}
      </div>
    </div>
  )
}