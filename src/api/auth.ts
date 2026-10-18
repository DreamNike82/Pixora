import { api } from './client'

// POST /register → { id, email, name }; POST /login → { id, email }; GET /me → { id, email, tier }
export type User = {
  id: string
  email: string
  name?: string
  tier?: string
}

export type RegisterPayload = { email: string; password: string; name: string }
export type LoginPayload = { email: string; password: string }

export const authApi = {
  me: () => api<User>('/api/auth/me'),
  register: (data: RegisterPayload) =>
    api<User>('/api/auth/register', { method: 'POST', body: data }),
  login: (data: LoginPayload) =>
    api<User>('/api/auth/login', { method: 'POST', body: data }),
  logout: () => api<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
}
