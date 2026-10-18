import { api } from './client'
import { normalizePhoto } from './photos'
import type { Photo } from './photos'

export type GalleryStatus = 'DRAFT' | 'PUBLISHED'

export type Section = { id: string; name: string }

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
}

// POST /api/admin/galleries
export type CreateGalleryPayload = {
  title: string
  clientName?: string
  date?: string // YYYY-MM-DD
  location?: string
  status: GalleryStatus
}

// PATCH /api/admin/galleries/[id]
export type UpdateGalleryPayload = {
  status?: GalleryStatus
  coverUrl?: string
  settings?: GallerySettings
}

type RawGallery = Omit<GalleryDetails, 'photos' | 'settings'> & { photos?: any[]; settings?: Record<string, any> }

const normalize = (g: RawGallery): GalleryDetails => ({
  ...g,
  settings: normalizeSettings(g as Record<string, any>),
  photos: (g.photos ?? []).map(normalizePhoto),
})

// GET .../analytics → { views, downloads, favorites }
export type Analytics = { views: number; downloads: number; favorites: number }

// GET .../selections → [{ clientName, photoCount, status }]; id береться з маршруту /selections/[selectionId]
export type Selection = {
  id: string
  clientName: string
  photoCount: number
  status: string
}

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
  downloadZip: (id: string) => api<{ downloadUrl: string }>(`${base(id)}/download`),
  createSection: (id: string, name: string) =>
    api<Section>(`${base(id)}/sections`, { method: 'POST', body: { name } }),

  selections: (id: string) => api<Selection[]>(`${base(id)}/selections`),
  removeSelection: (id: string, selectionId: string) =>
    api<{ success: boolean }>(`${base(id)}/selections/${selectionId}`, { method: 'DELETE' }),
  exportSelection: (id: string, selectionId: string) =>
    api<{ filenames: string[] }>(`${base(id)}/selections/${selectionId}/export`),
}
