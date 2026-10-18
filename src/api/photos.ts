import { api } from './client'

// Модель фото за API_DOCS.md: { id, url, filename }.
// sectionId у документації окремо не описаний, але приймається при завантаженні (поле sectionId) — читаємо його, якщо сервер віддає.
export type Photo = {
  id: string
  url: string // порожній рядок — фото ще обробляється (напр. після завантаження через S3)
  filename: string
  sectionId?: string | null
}

type RawPhoto = { id: string; url?: string | null; filename?: string | null; sectionId?: string | null }

export const normalizePhoto = (raw: RawPhoto): Photo => ({
  id: String(raw.id),
  url: raw.url ?? '',
  filename: raw.filename ?? 'photo',
  sectionId: raw.sectionId ?? null,
})

// Vercel не пропускає тіло запиту більше ~4.5 MB, тому великі файли йдуть через presigned URL у S3
const DIRECT_UPLOAD_LIMIT = 4_000_000

export const photosApi = {
  // POST /api/admin/galleries/[id]/photos — multipart/form-data: file (JPEG, PNG), sectionId (опційно)
  uploadDirect: (galleryId: string, file: File, sectionId?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (sectionId) formData.append('sectionId', sectionId)
    return api<RawPhoto>(`/api/admin/galleries/${galleryId}/photos`, { method: 'POST', formData }).then(normalizePhoto)
  },

  // POST .../photos/upload-url { filename, contentType, size } → { uploadUrl, photoId }, далі PUT файла у S3.
  // Примітка: upload-url у документації не приймає sectionId, тому великі файли потрапляють без розділу.
  uploadViaS3: async (galleryId: string, file: File): Promise<Photo> => {
    const { uploadUrl, photoId } = await api<{ uploadUrl: string; photoId: string }>(
      `/api/admin/galleries/${galleryId}/photos/upload-url`,
      { method: 'POST', body: { filename: file.name, contentType: file.type, size: file.size } },
    )

    // Запит іде напряму в S3, без наших кук
    const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
    if (!res.ok) throw new Error(`Не вдалося завантажити «${file.name}» (S3: ${res.status})`)

    // POST .../photos/process { photoIds } — водяний знак і ресайз. Збій тут не робить завантаження невдалим.
    await photosApi.process(galleryId, [photoId]).catch(() => {})

    return { id: photoId, url: '', filename: file.name }
  },

  upload: (galleryId: string, file: File, sectionId?: string) =>
    file.size > DIRECT_UPLOAD_LIMIT
      ? photosApi.uploadViaS3(galleryId, file)
      : photosApi.uploadDirect(galleryId, file, sectionId),

  process: (galleryId: string, photoIds: string[]) =>
    api<{ jobId: string; status: string }>(`/api/admin/galleries/${galleryId}/photos/process`, {
      method: 'POST',
      body: { photoIds },
    }),

  remove: (galleryId: string, photoId: string) =>
    api<{ success: boolean }>(`/api/admin/galleries/${galleryId}/photos/${photoId}`, { method: 'DELETE' }),

  // DELETE .../photos/batch { photoIds } → { success, deletedCount }
  batchRemove: (galleryId: string, photoIds: string[]) =>
    api<{ success: boolean; deletedCount: number }>(`/api/admin/galleries/${galleryId}/photos/batch`, {
      method: 'DELETE',
      body: { photoIds },
    }),
}
