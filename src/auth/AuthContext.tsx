import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../api/auth'
import { setUnauthorizedHandler } from '../api/client'
import type { LoginPayload, RegisterPayload, User } from '../api/auth'

type AuthState = {
  user: User | null
  loading: boolean // true, поки перевіряємо сесію при старті
  login: (data: LoginPayload) => Promise<void>
  register: (data: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Відновлюємо сесію з куки. 401 тут — нормальна ситуація (гість), не помилка.
  useEffect(() => {
    authApi
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  // Якщо будь-який адмінський запит поверне 401 — сесія закінчилась, ProtectedRoute відправить на головну
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (data: LoginPayload) => {
    await authApi.login(data)
    setUser(await authApi.me()) // /login повертає лише id та email, а /me ще й tier
  }, [])

  const register = useCallback(
    async (data: RegisterPayload) => {
      await authApi.register(data)
      // Невідомо, чи бекенд ставить куку після реєстрації, тому входимо явно.
      await login({ email: data.email, password: data.password })
    },
    [login],
  )

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {})
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
