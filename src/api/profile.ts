import { api } from './client'

// GET /api/admin/profile → { name, bio, instagram, watermarkEnabled }
export type Profile = {
  name?: string
  bio?: string
  instagram?: string
  watermarkEnabled?: boolean
  // Не описані в документації GET /profile; читаємо, якщо сервер їх віддає, інакше беремо з локального кешу
  avatarUrl?: string
  logoUrl?: string
  watermarkUrl?: string
  watermarkAuto?: boolean // знак створено автоматично з Instagram
  watermarkAutoText?: string
}

export type ProfileUpdate = Pick<Profile, 'name' | 'bio' | 'instagram' | 'watermarkEnabled'>

export type BrandAssetType = 'avatar' | 'logo' | 'watermark'

// Кеш адрес завантажених зображень: якщо GET /profile їх не повертає, після оновлення сторінки вони б «зникали»
const CACHE_KEY = 'pixora-brand-assets'
type Cache = Partial<Record<BrandAssetType, string>> & { watermarkAuto?: boolean; watermarkAutoText?: string }

const readCache = (): Cache => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}')
  } catch {
    return {}
  }
}
const writeCache = (patch: Cache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...readCache(), ...patch }))
  } catch {
    /* сховище недоступне — не критично */
  }
}

const firstString = (raw: Record<string, any>, keys: string[]): string | undefined => {
  for (const k of keys) if (typeof raw[k] === 'string' && raw[k]) return raw[k]
  return undefined
}

const normalizeProfile = (raw: Record<string, any>): Profile => {
  const cache = readCache()
  return {
    ...raw,
    avatarUrl: firstString(raw, ['avatarUrl', 'avatar', 'avatarImage']) ?? cache.avatar,
    logoUrl: firstString(raw, ['logoUrl', 'logo', 'logoImage']) ?? cache.logo,
    watermarkUrl: firstString(raw, ['watermarkUrl', 'watermark', 'watermarkImage', 'watermarkImageUrl']) ?? cache.watermark,
    watermarkAuto: cache.watermarkAuto,
    watermarkAutoText: cache.watermarkAutoText,
  }
}

export const profileApi = {
  get: () => api<Record<string, any>>('/api/admin/profile').then(normalizeProfile),
  update: (data: ProfileUpdate) =>
    api<{ success: boolean }>('/api/admin/profile', { method: 'PATCH', body: data }),

  // POST /api/admin/upload-brand-asset — multipart: type (avatar | logo | watermark), file (JPEG, PNG, WEBP)
  // opts.auto — знак згенеровано з Instagram (запам'ятовуємо текст, щоб оновити його при зміні Instagram)
  uploadBrandAsset: async (type: BrandAssetType, file: File, opts: { auto?: string } = {}) => {
    const formData = new FormData()
    formData.append('type', type)
    formData.append('file', file)
    const res = await api<Record<string, any>>('/api/admin/upload-brand-asset', { method: 'POST', formData })
    const url = firstString(res ?? {}, ['url', 'imageUrl', 'fileUrl', 'publicUrl'])
    if (!url) throw new Error('Сервер прийняв файл, але не повернув адресу зображення')
    writeCache({
      [type]: url,
      ...(type === 'watermark' ? { watermarkAuto: !!opts.auto, watermarkAutoText: opts.auto } : {}),
    })
    return { url }
  },
}
