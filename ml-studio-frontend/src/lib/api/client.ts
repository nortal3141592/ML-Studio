const BASE_URL = import.meta.env.VITE_API_BASE_URL
const TOKEN_KEY = 'ml_studio_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

interface FastAPIValidationError {
  loc: (string | number)[]
  msg: string
  type: string
}

type FastAPIErrorBody =
  | { detail: string }
  | { detail: FastAPIValidationError[] }

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, body: unknown) {
    const detail = ApiError.extractDetail(body)
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }

  private static extractDetail(body: unknown): string {
    if (!body || typeof body !== 'object' || !('detail' in body)) {
      return 'Something went wrong'
    }
    const detail = (body as FastAPIErrorBody).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail.map((e) => `${e.loc.at(-1)}: ${e.msg}`).join(', ')
    }
    return 'Something went wrong'
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  isFormData?: boolean
  responseType?: 'json' | 'blob'
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, isFormData = false, responseType = 'json' } = options
  const token = getToken()

  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!isFormData && body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
  let errorBody: unknown = null
  try {
    errorBody = await response.json()
  } catch {
    // no JSON body
  }
  const error = new ApiError(response.status, errorBody)

  if (response.status === 401) {
    clearToken()
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
  }

  throw error
}

  if (response.status === 204) {
    return undefined as T
  }

  if (responseType === 'blob') {
    return (await response.blob()) as T
  }

  return response.json() as Promise<T>
}

export async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${BASE_URL}${path}`, { headers })

  if (!response.ok) {
  let errorBody: unknown = null
  try {
    errorBody = await response.json()
  } catch {
    // no JSON body
  }
  const error = new ApiError(response.status, errorBody)

  if (response.status === 401) {
    clearToken()
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
  }

  throw error
}

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="?([^"]+)"?/)
  const filename = match?.[1] ?? fallbackFilename

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}