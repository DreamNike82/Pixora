import { api, BASE_URL } from './client'
import { normalizeSettings } from './galleries'
import type { GallerySettings } from './galleries'
import { normalizePhoto } from './photos'
import type { Photo } from './photos'

export type ClientPhoto = Photo & { favorite?: boolean }

// GET /api/client/g/[accessToken] → { id, title, photographer: { name }, photos, settings }
export type ClientGallery = {
  id: string
  title: string
  photographer?: { name?: string }
  photos: ClientPhoto[]
  settings: GallerySettings
}

// POST /api/client/galleries/[id]/selections
export type SelectionPayload = {
  clientName: string
  clientEmail: string
  photoIds: string[]
  comment?: string
}

type RawClientGallery = Omit<ClientGallery, 'photos' | 'settings'> & { photos?: any[]; settings?: Record<string, any> }

export const clientApi = {
  get: (token: string) =>
    api<RawClientGallery>(`/api/client/g/${token}`).then(
      (g): ClientGallery => ({
        ...g,
        settings: normalizeSettings(g as Record<string, any>),
        photos: (g.photos ?? []).map((p) => ({ ...normalizePhoto(p), favorite: Boolean(p.favorite ?? p.isFavorite) })),
      }),
    ),

  // GET /api/client/galleries/[id] (Public) → { title }
  getPublic: (galleryId: string) => api<{ title: string }>(`/api/client/galleries/${galleryId}`),

  // POST /api/client/g/[accessToken]/lock { pin } — відповідь у документації не описана, на успіх достатньо 2xx
  lock: (token: string, pin: string) =>
    api<unknown>(`/api/client/g/${token}/lock`, { method: 'POST', body: { pin } }),

  // PATCH /api/client/g/[accessToken]/photos/[photoId] { favorite }
  favorite: (token: string, photoId: string, favorite: boolean) =>
    api<{ success: boolean }>(`/api/client/g/${token}/photos/${photoId}`, {
      method: 'PATCH',
      body: { favorite },
    }),

  submitSelection: (galleryId: string, data: SelectionPayload) =>
    api<{ success: boolean; selectionId: string }>(`/api/client/galleries/${galleryId}/selections`, {
      method: 'POST',
      body: data,
    }),

  // GET /api/client/galleries/[id]/download → { downloadUrl } (враховує налаштування скачування)
  download: (galleryId: string) =>
    api<{ downloadUrl: string }>(`/api/client/galleries/${galleryId}/download`),

  // POST /api/client/galleries/[id]/download-token { email } → { token } (anti-hotlink)
  downloadToken: (galleryId: string, email: string) =>
    api<{ token: string }>(`/api/client/galleries/${galleryId}/download-token`, { method: 'POST', body: { email } }),

  // GET /api/client/galleries/[id]/photos/[photoId]/download — відповідь у документації не описана, тому відкриваємо URL
  photoDownloadUrl: (galleryId: string, photoId: string) =>
    `${BASE_URL}/api/client/galleries/${galleryId}/photos/${photoId}/download`,
}
