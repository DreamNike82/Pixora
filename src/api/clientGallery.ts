import { api, downloadArchive } from './client'
import { normalizeSettings } from './galleries'
import type { GallerySettings } from './galleries'
import { normalizePhoto } from './photos'
import type { Photo } from './photos'

export type ClientPhoto = Photo & { favorite?: boolean }

// Бренд фотографа в клієнтській галереї. У документації GET /api/client/g/[accessToken] описано лише photographer.name,
// але портфоліо (/api/client/portfolio/[handle]) віддає avatarUrl, studioName, handle — читаємо все це і тут, якщо сервер надсилає.
export type Photographer = {
  name?: string
  studioName?: string
  handle?: string
  bio?: string
  instagram?: string
  avatarUrl?: string
  logoUrl?: string
  watermarkUrl?: string // зображення знака, якщо сервер його віддає
  watermarkEnabled?: boolean
  customFooter?: string
}

// GET /api/client/g/[accessToken] → { id, title, photographer: { name, avatarUrl?, logoUrl?, ... }, photos, settings }
export type ClientGallery = {
  id: string
  title: string
  photographer?: Photographer
  photos: ClientPhoto[]
  settings: GallerySettings
}

const str = (raw: Record<string, any>, keys: string[]): string | undefined => {
  for (const k of keys) if (typeof raw[k] === 'string' && raw[k].trim()) return raw[k].trim()
  return undefined
}

export function normalizePhotographer(raw: unknown): Photographer | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, any>
  return {
    name: str(r, ['name', 'displayName', 'fullName']),
    studioName: str(r, ['studioName', 'studio']),
    handle: str(r, ['handle', 'nickname']),
    bio: str(r, ['bio']),
    instagram: str(r, ['instagram']),
    avatarUrl: str(r, ['avatarUrl', 'avatar', 'avatarImage']),
    logoUrl: str(r, ['logoUrl', 'logo', 'logoImage']),
    watermarkUrl: str(r, ['watermarkUrl', 'watermark', 'watermarkImage', 'watermarkImageUrl']),
    watermarkEnabled: typeof r.watermarkEnabled === 'boolean' ? r.watermarkEnabled : undefined,
    customFooter: str(r, ['customFooter', 'footer']),
  }
}

// POST /api/client/galleries/[id]/selections
export type SelectionPayload = {
  clientName: string
  clientEmail: string
  photoIds: string[]
  comment?: string
}

type RawClientGallery = Omit<ClientGallery, 'photos' | 'settings' | 'photographer'> & {
  photographer?: Record<string, any>
  photos?: any[]
  settings?: Record<string, any>
}

export const clientApi = {
  get: (token: string) =>
    api<RawClientGallery>(`/api/client/g/${token}`).then(
      (g): ClientGallery => ({
        ...g,
        photographer: normalizePhotographer(g.photographer),
        settings: normalizeSettings(g as Record<string, any>),
        photos: (g.photos ?? []).map((p) => ({ ...normalizePhoto(p), favorite: Boolean(p.isSelected ?? p.favorite ?? p.isFavorite) })),
      }),
    ),

  // GET /api/client/galleries/[id] (Public) → { title }
  getPublic: (galleryId: string) => api<{ title: string }>(`/api/client/galleries/${galleryId}`),

  // POST /api/client/g/[accessToken]/lock { pin } — відповідь у документації не описана, на успіх достатньо 2xx
  lock: (token: string, pin: string) =>
    api<unknown>(`/api/client/g/${token}/lock`, { method: 'POST', body: { pin } }),

  // PATCH /api/client/g/[accessToken]/photos/[photoId] — бекенд вимагає поле isSelected (у документації помилково favorite)
  favorite: (token: string, photoId: string, selected: boolean) =>
    api<{ success: boolean }>(`/api/client/g/${token}/photos/${photoId}`, {
      method: 'PATCH',
      body: { isSelected: selected },
    }),

  submitSelection: (galleryId: string, data: SelectionPayload) =>
    api<{ success: boolean; selectionId: string }>(`/api/client/galleries/${galleryId}/selections`, {
      method: 'POST',
      body: data,
    }),

  // GET /api/client/galleries/[id]/download → { downloadUrl } (враховує налаштування скачування)
  download: (galleryId: string) => downloadArchive(`/api/client/galleries/${galleryId}/download`, 'gallery.zip'),

  // POST /api/client/galleries/[id]/download-token { email } → { token } (anti-hotlink)
  downloadToken: (galleryId: string, email: string) =>
    api<{ token: string }>(`/api/client/galleries/${galleryId}/download-token`, { method: 'POST', body: { email } }),

  // GET /api/client/galleries/[id]/photos/[photoId]/download — відповідь у документації не описана:
  // обробляємо і JSON з посиланням, і сам файл
  downloadPhoto: (galleryId: string, photoId: string, filename = 'photo.jpg', opts: { anchor?: boolean } = {}) =>
    downloadArchive(`/api/client/galleries/${galleryId}/photos/${photoId}/download`, filename, opts),
}
