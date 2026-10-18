import { api, downloadArchive } from './client'
import { normalizePhoto } from './photos'
import type { Photo } from './photos'

// Фактичні значення з валідації бекенду (у API_DOCS.md помилково PUBLISHED): DRAFT | ACTIVE | ARCHIVED.
// ACTIVE = опубліковано, галерея доступна клієнту за посиланням.
export type GalleryStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'

// Бекенд називає розділ полем title (у документації name); у UI використовуємо name
export type Section = { id: string; name: string }
const normalizeSection = (raw: Record<string, any>): Section => ({
  id: String(raw.id),
  name: String(raw.title ?? raw.name ?? ''),
})

/**
 * Налаштування галереї. У API_DOCS.md описане лише `downloadEnabled` (settings: { downloadEnabled }).
 * Решта полів — розширені (вибір фото, термін дії, водяний знак): їх немає в документації,
 * тому читаємо їх і з `settings`, і (на випадок плоского формату) з кореня відповіді.
 */
export type GallerySettings = {
  downloadEnabled?: boolean // документовано
  allowSelection?: boolean
  isSelectionLocked?: boolean
  maxSelectionCount?: number | null
  expiresAt?: string | null
  watermarkEnabled?: boolean
  watermarkText?: string | null
  watermarkOpacity?: number | null // 0..1
}

const EXTENDED_KEYS = [
  'allowSelection',
  'isSelectionLocked',
  'maxSelectionCount',
  'expiresAt',
  'watermarkEnabled',
  'watermarkText',
  'watermarkOpacity',
] as const

export function normalizeSettings(raw: Record<string, any>): GallerySettings {
  const s: GallerySettings = { ...(raw.settings ?? {}) }
  s.downloadEnabled ??= raw.downloadEnabled ?? raw.allowDownload
  for (const k of EXTENDED_KEYS) if (s[k] === undefined && raw[k] !== undefined) (s as any)[k] = raw[k]
  return s
}

// GET /api/admin/galleries → [{ id, title, status, coverUrl }]
export type GalleryListItem = {
  id: string
  title: string
  status: GalleryStatus
  coverUrl?: string | null
}

// GET /api/admin/galleries/[id] → { id, title, photos, settings, ... }
export type GalleryDetails = {
  id: string
  title: string
  status?: GalleryStatus
  clientName?: string | null
  date?: string | null // дата зйомки
  location?: string | null
  coverUrl?: string | null
  accessToken?: string // у документації не описаний, але потрібен для публічного посилання /g/[accessToken]
  settings: GallerySettings
  sections?: Section[]
  photos: Photo[]
  rawKeys?: string[] // назви полів відповіді сервера — для діагностики
}

// POST /api/admin/galleries
export type CreateGalleryPayload = {
  title: string
  clientName?: string
  date?: string // YYYY-MM-DD
  location?: string
  status: GalleryStatus
}

// PATCH /api/admin/galleries/[id] — у документації тіло містить усі три поля: { status, coverUrl, settings: { downloadEnabled } }
export type UpdateGalleryPayload = {
  status?: GalleryStatus
  coverUrl?: string
  settings?: { downloadEnabled?: boolean }
  allowDownload?: boolean // плоске поле моделі Gallery на бекенді (settings.downloadEnabled з документації може ігноруватися)
}

/**
 * Збирає тіло PATCH строго у форматі з документації: завжди передаємо status, settings.downloadEnabled і coverUrl
 * (якщо він відомий), підставляючи поточні значення галереї для полів, які не змінюємо.
 * Так сервер не відхиляє запит валідацією через відсутні поля.
 */
export function buildUpdate(
  gallery: GalleryDetails,
  patch: { status?: GalleryStatus; coverUrl?: string; downloadEnabled?: boolean },
): UpdateGalleryPayload {
  const coverUrl = patch.coverUrl ?? gallery.coverUrl ?? gallery.photos.find((p) => p.url)?.url
  return {
    status: patch.status ?? gallery.status ?? 'DRAFT',
    ...(coverUrl ? { coverUrl } : {}),
    settings: { downloadEnabled: patch.downloadEnabled ?? gallery.settings.downloadEnabled ?? true },
  }
}

type RawGallery = Omit<GalleryDetails, 'photos' | 'settings' | 'sections'> & { photos?: any[]; settings?: Record<string, any>; sections?: any[] }

const normalize = (g: RawGallery): GalleryDetails => ({
  ...g,
  settings: normalizeSettings(g as Record<string, any>),
  photos: (g.photos ?? []).map(normalizePhoto),
  sections: g.sections?.map(normalizeSection),
  rawKeys: Object.keys(g),
})

// GET .../analytics → { views, downloads, favorites }
export type Analytics = { views: number; downloads: number; favorites: number }

// GET .../selections → [{ clientName, photoCount, status }]; id береться з маршруту /selections/[selectionId]
export type Selection = {
  id: string
  clientName: string
  clientEmail?: string
  comment?: string
  photoCount: number
  status: string
}

// Сервер може віддати список масивом або обгорнутим в об'єкт; поля теж можуть називатися трохи інакше
const unwrapList = (data: any): any[] => {
  if (Array.isArray(data)) return data
  const list = [data?.selections, data?.items, data?.data, data?.results].find(Array.isArray)
  if (list) return list
  throw new Error(`Невідомий формат списку відборів. Поля відповіді: ${data && typeof data === 'object' ? Object.keys(data).join(', ') || '(порожньо)' : String(data)}`)
}

const normalizeSelection = (r: Record<string, any>): Selection => ({
  id: String(r.id ?? r.selectionId),
  clientName: r.clientName ?? r.name ?? r.client?.name ?? 'Клієнт',
  clientEmail: r.clientEmail ?? r.email ?? undefined,
  comment: r.comment ?? undefined,
  photoCount: r.photoCount ?? r.count ?? r.photoIds?.length ?? r.photos?.length ?? r.items?.length ?? r._count?.photos ?? r._count?.items ?? 0,
  status: r.status ?? '',
})

const base = (id: string) => `/api/admin/galleries/${id}`

export const galleriesApi = {
  list: () => api<GalleryListItem[]>('/api/admin/galleries'),
  get: (id: string) => api<RawGallery>(base(id)).then(normalize),
  create: (data: CreateGalleryPayload) =>
    api<GalleryListItem>('/api/admin/galleries', { method: 'POST', body: data }),
  update: (id: string, data: UpdateGalleryPayload) =>
    api<{ success: boolean }>(base(id), { method: 'PATCH', body: data }),
  remove: (id: string) => api<{ success: boolean }>(base(id), { method: 'DELETE' }),

  analytics: (id: string) => api<Analytics>(`${base(id)}/analytics`),
  // GET .../download → { downloadUrl } (або сам файл — обидва варіанти обробляє downloadArchive)
  downloadZip: (id: string) => downloadArchive(`${base(id)}/download`, 'gallery.zip'),
  // POST .../sections — бекенд вимагає поле title (документація помилково пише name)
  createSection: (id: string, name: string) =>
    api<Record<string, any>>(`${base(id)}/sections`, { method: 'POST', body: { title: name } }).then(normalizeSection),

  selections: (id: string) => api<unknown>(`${base(id)}/selections`).then((d) => unwrapList(d).map(normalizeSelection)),
  removeSelection: (id: string, selectionId: string) =>
    api<{ success: boolean }>(`${base(id)}/selections/${selectionId}`, { method: 'DELETE' }),
  exportSelection: (id: string, selectionId: string) =>
    api<any>(`${base(id)}/selections/${selectionId}/export`).then((d): { filenames: string[] } => ({
      filenames: Array.isArray(d) ? d : d?.filenames ?? d?.files ?? [],
    })),
}
