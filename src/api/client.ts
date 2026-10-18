export const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  formData?: FormData
}

// AuthProvider реєструє сюди callback, який скидає користувача, коли сесія протухла
let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn
}

export async function api<T = unknown>(
  path: string,
  { method = 'GET', body, formData }: Options = {},
): Promise<T> {
  const hasJson = body !== undefined

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include', // без цього сесійна кука не збережеться і не відправиться
    headers: hasJson ? { 'Content-Type': 'application/json' } : undefined,
    body: formData ?? (hasJson ? JSON.stringify(body) : undefined),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    // 401 на адмінських роутах = сесія закінчилась. /api/auth/* і /api/client/* не чіпаємо:
    // там 401 — звичайна ситуація (гість / галерея під PIN-кодом).
    if (res.status === 401 && path.startsWith('/api/admin')) onUnauthorized?.()
    throw new ApiError(res.status, data?.message ?? data?.error ?? `HTTP ${res.status}`)
  }
  return data as T
}
