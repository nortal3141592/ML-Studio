import { apiFetch, setToken, clearToken } from './client'
import type {
  UserPrivate,
  UserCreate,
  UserUpdate,
  Token,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from './types/auth'

export function register(data: UserCreate): Promise<UserPrivate> {
  return apiFetch<UserPrivate>('/api/users', { method: 'POST', body: data })
}

export async function login(email: string, password: string): Promise<Token> {
  const form = new URLSearchParams()
  form.set('username', email) // OAuth2 spec requires this field be named "username" on the wire
  form.set('password', password)

  const token = await apiFetch<Token>('/api/users/token', {
    method: 'POST',
    body: form,
    isFormData: true,
  })

  setToken(token.access_token)
  return token
}

export function logout(): void {
  clearToken()
}

export function getCurrentUser(): Promise<UserPrivate> {
  return apiFetch<UserPrivate>('/api/users/me')
}

export function forgotPassword(data: ForgotPasswordRequest): Promise<void> {
  return apiFetch<void>('/api/users/forgot-password', { method: 'POST', body: data })
}

export function resetPassword(data: ResetPasswordRequest): Promise<void> {
  return apiFetch<void>('/api/users/reset-password', { method: 'POST', body: data })
}

export function changePassword(data: ChangePasswordRequest): Promise<void> {
  return apiFetch<void>('/api/users/me/password', { method: 'PATCH', body: data })
}

export function updateUser(userId: number, data: UserUpdate): Promise<UserPrivate> {
  return apiFetch<UserPrivate>(`/api/users/${userId}`, { method: 'PATCH', body: data })
}