import { useState } from 'react'
import { useCurrentUser, useUpdateUser, useChangePassword } from '../lib/hooks/useAuth'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useToast } from '../lib/ToastContext'

export function AccountPage() {
  const { data: user } = useCurrentUser()
  const updateUser = useUpdateUser()
  const changePassword = useChangePassword()
  const { showToast } = useToast()

  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  if (!user) return null

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateUser.mutate(
      { userId: user!.id, data: { username, email } },
      { onSuccess: () => showToast('Profile updated', 'success') }
    )
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    changePassword.mutate(
      { current_password: currentPassword, new_password: newPassword },
      {
        onSuccess: () => {
          showToast('Password changed', 'success')
          setCurrentPassword('')
          setNewPassword('')
        },
      }
    )
  }

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-lg font-medium text-text">Account settings</h1>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-3">
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" size="sm" disabled={updateUser.isPending}>
            {updateUser.isPending ? 'Saving...' : 'Save changes'}
          </Button>
          {updateUser.isError && <p className="text-xs text-error">{updateUser.error.message}</p>}
        </form>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
          />
          <Button type="submit" size="sm" disabled={changePassword.isPending}>
            {changePassword.isPending ? 'Updating...' : 'Update password'}
          </Button>
          {changePassword.isError && <p className="text-xs text-error">{changePassword.error.message}</p>}
        </form>
      </Card>
    </div>
  )
}