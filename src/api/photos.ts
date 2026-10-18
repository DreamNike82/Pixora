import { api } from './client'

// Документація гарантує лише { id, url, filename } (відповідь завантаження). У списку фото (GET галереї)
// поля описані як "[...]", тому адресу зображення шукаємо серед відомих варіантів назв.
export type Photo = {
  id: string
  url: string // найкраща доступна адреса для перегляду; порожній рядок — фото ще обробляється
  thumbUrl?: string // мініатюра, якщо сервер її віддає
  filename: string
  sectionId?: string | null
  status?: string // напр. PROCESSING / READY, якщо сервер віддає
  rawKeys?: string[] // назви полів з відповіді — лише якщо адресу зображення знайти не вдалося (для діагностики)
}

const VIEW_KEYS = ['url', 'previewUrl', 'displayUrl', 'webUrl', 'watermarkedUrl', 'optimizedUrl', 'publicUrl', 'imageUrl', 'fileUrl', 'signedUrl', 'src', 'thumbnailUrl', 'thumbUrl', 'thumbnail', 'originalUrl']
const THUMB_KEYS = ['thumbnailUrl', 'thumbUrl', 'thumbnail', 'smallUrl', 'previewUrl']

const pick = (raw: Record<string, any>, keys: string[]): string => {
  const nested = (raw.urls ?? raw.variants ?? {}) as Record<string, unknown>
  for (const k of keys) {
    const v = raw[k] ?? nested[k]
    if (typeof v === 'string' && v) return v
  }
  return ''
}

export function normalizePhoto(raw: Record<string, any>): Photo {
  const url = pick(raw, VIEW_KEYS)
  return {
    id: String(raw.id),
    url,
    thumbUrl: pick(raw, THUMB_KEYS) || undefined,
    filename: raw.filename ?? raw.fileName ?? raw.originalName ?? raw.originalFilename ?? raw.name ?? 'photo',
    sectionId: raw.sectionId ?? raw.section?.id ?? null,
    status: raw.status ?? raw.processingStatus ?? undefined,
    rawKeys: url ? undefined : Object.keys(raw),
  }
}

export const isPending = (p: Photo) => !p.url && (!p.rawKeys || /PROCESS|PENDING|UPLOAD|QUEUE/i.test(p.status ?? ''))

// Vercel не пропускає тіло запиту більше ~4.5 MB, тому великі файли йдуть через presigned URL у S3
const DIRECT_UPLOAD_LIMIT = 4_000_000

export const photosApi = {
  // POST /api/admin/galleries/[id]/photos — multipart/form-data: file (JPEG, PNG), sectionId (опційно)
  uploadDirect: (galleryId: string, file: File, sectionId?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (sectionId) formData.append('sectionId', sectionId)
    return api<Record<string, any>>(`/api/admin/galleries/${galleryId}/photos`, { method: 'POST', formData }).then(async (raw) => {
      const photo = normalizePhoto(raw)
      // POST .../photos/process { photoIds } — водяний знак і ресайз (за документацією). Збій не робить завантаження невдалим.
      await photosApi.process(galleryId, [photo.id]).catch(() => {})
      return photo
    })
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
