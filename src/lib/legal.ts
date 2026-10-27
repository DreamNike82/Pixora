// Юридичні сторінки живуть на бекенді (pixora-ashy-iota.vercel.app): /terms, /privacy, /cookies, /refund.
// Фронтенд лише посилається на них, щоб був один актуальний текст. Базову адресу можна змінити через VITE_LEGAL_URL
// (наприклад, коли сторінки переїдуть на власний домен).
export const LEGAL_BASE = ((import.meta.env.VITE_LEGAL_URL as string | undefined) || 'https://pixora-ashy-iota.vercel.app').replace(/\/+$/, '')

export const SUPPORT_EMAIL = 'support@pixora.app'

export type LegalPage = 'terms' | 'privacy' | 'cookies' | 'refund'

export const LEGAL_PAGES: { page: LegalPage; label: string }[] = [
  { page: 'terms', label: 'Умови' },
  { page: 'privacy', label: 'Конфіденційність' },
  { page: 'cookies', label: 'Cookies' },
  { page: 'refund', label: 'Повернення коштів' },
]

export const legalUrl = (page: LegalPage) => `${LEGAL_BASE}/${page}`
