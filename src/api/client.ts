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

// Бекенд повертає «Ошибка валидации» + деталі в окремому полі — показуємо їх, щоб було видно, яке поле не пройшло
function errorMessage(data: any, status: number): string {
  if (status === 413) return 'Файл завеликий для сервера. Зменшіть розмір зображення'
  const base: string = data?.message ?? data?.error ?? `HTTP ${status}`
  if (!data || typeof data !== 'object') return base
  const details = data.details ?? data.issues ?? data.errors ?? data.fieldErrors
  if (!details) return base
  let text = ''
  if (Array.isArray(details)) {
    text = details
      .map((d: any) => (typeof d === 'string' ? d : [Array.isArray(d?.path) ? d.path.join('.') : d?.path ?? d?.field, d?.message].filter(Boolean).join(': ')))
      .filter(Boolean)
      .join('; ')
  } else {
    text = JSON.stringify(details)
  }
  return text ? `${base} (${text.slice(0, 300)})` : base
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
    throw new ApiError(res.status, errorMessage(data, res.status))
  }
  return data as T
}

/**
 * Ендпоінти «скачати архів» у документації повертають { downloadUrl }, але на практиці можуть віддавати
 * сам файл. Підтримуємо обидва варіанти: JSON з посиланням → переходимо за ним, інакше зберігаємо отриманий файл.
 */
function startBrowserDownload(url: string, hidden = false) {
  if (!hidden) {
    window.location.href = url
    return
  }
  // Прихований iframe: не залишає сторінку і не скасовує попередні завантаження в серії
  const frame = document.createElement('iframe')
  frame.style.display = 'none'
  frame.src = url
  document.body.appendChild(frame)
  setTimeout(() => frame.remove(), 60_000)
}

export async function downloadArchive(path: string, fallbackName = 'gallery.zip', opts: { anchor?: boolean } = {}): Promise<void> {
  const url = `${BASE_URL}${path}`
  let res: Response
  try {
    res = await fetch(url, { credentials: 'include' })
  } catch {
    // «Failed to fetch»: зазвичай сервер перенаправляє на S3, а fetch блокується через CORS.
    // Віддаємо завантаження браузеру напряму — він сам піде за редиректом і збереже файл.
    startBrowserDownload(url, opts.anchor)
    return
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    if (res.status === 401 && path.startsWith('/api/admin')) onUnauthorized?.()
    throw new ApiError(res.status, errorMessage(data, res.status))
  }

  const type = res.headers.get('content-type') ?? ''
  if (type.includes('application/json')) {
    const data = await res.json().catch(() => null)
    const url: unknown = data?.downloadUrl ?? data?.url
    if (typeof url !== 'string' || !url) throw new Error('Сервер не повернув посилання на архів')
    if (opts.anchor) {
      // Для серії завантажень не переходимо по посиланню (це скасувало б попередні), а клікаємо по прихованому <a>
      const a = document.createElement('a')
      a.href = url
      a.download = fallbackName
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } else {
      window.location.href = url
    }
    return
  }

  const blob = await res.blob()
  if (blob.size === 0) throw new Error('Сервер повернув порожній архів')
  const disposition = res.headers.get('content-disposition') ?? ''
  const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1]
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = name ? decodeURIComponent(name) : fallbackName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 10_000)
}
