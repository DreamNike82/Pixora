import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { legalUrl } from '../lib/legal'

export type AuthMode = 'login' | 'register'

type Props = {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
  onClose: () => void
  onSuccess?: () => void
}

const inputClass =
  'mt-2 w-full rounded-xl border border-[#d8c7bd] bg-white px-4 py-3 text-sm text-[#2a211e] outline-none transition focus:border-[#71142a] focus:ring-2 focus:ring-[#71142a]/20'

export default function AuthModal({ mode, onModeChange, onClose, onSuccess }: Props) {
  const { login, register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const isRegister = mode === 'register'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (isRegister) await register({ name, email, password })
      else await login({ email, password })
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Щось пішло не так. Спробуйте ще раз.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#27050e]/70 px-5 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="w-full max-w-[420px] rounded-[24px] bg-[#f7f0e9] p-8 text-[#2a211e] shadow-[0_30px_80px_rgba(39,5,14,.4)] sm:p-10"
      >
        <h2 id="auth-title" className="font-serif text-4xl text-[#4d1020]">
          {isRegister ? 'Створити акаунт' : 'З поверненням'}
        </h2>
        <p className="mt-2 text-sm text-[#766961]">
          {isRegister ? 'Почніть безкоштовно, без картки.' : 'Увійдіть, щоб керувати галереями.'}
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {isRegister && (
            <label className="block text-xs font-medium text-[#6e605a]">
              Ім’я
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </label>
          )}
          <label className="block text-xs font-medium text-[#6e605a]">
            Email
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="block text-xs font-medium text-[#6e605a]">
            Пароль
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? 8 : undefined}
              required
            />
          </label>

          {isRegister && (
            <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-[#6e605a]">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#71142a]"
              />
              <span>
                Я приймаю{' '}
                <a href={legalUrl('terms')} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#71142a] underline underline-offset-4">Умови використання</a>
                {' '}та{' '}
                <a href={legalUrl('privacy')} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#71142a] underline underline-offset-4">Політику конфіденційності</a>
              </span>
            </label>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-[#71142a]/10 px-4 py-3 text-sm text-[#71142a]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || (isRegister && !agreed)}
            className="button w-full bg-[#561124] text-white disabled:opacity-60"
          >
            {submitting ? 'Зачекайте…' : isRegister ? 'Створити акаунт' : 'Увійти'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#766961]">
          {isRegister ? 'Вже є акаунт?' : 'Ще немає акаунта?'}{' '}
          <button
            type="button"
            className="font-semibold text-[#71142a] underline underline-offset-4"
            onClick={() => {
              setError(null)
              onModeChange(isRegister ? 'login' : 'register')
            }}
          >
            {isRegister ? 'Увійти' : 'Зареєструватися'}
          </button>
        </p>
      </div>
    </div>
  )
}
