import { api } from './client'

// GET /api/admin/profile → { name, bio, instagram, watermarkEnabled }
export type Profile = {
  name?: string
  bio?: string
  instagram?: string
  watermarkEnabled?: boolean
  // Не описані в документації GET /profile; читаємо, якщо сервер їх віддає
  avatarUrl?: string
  logoUrl?: string
  watermarkUrl?: string
}

export type ProfileUpdate = Pick<Profile, 'name' | 'bio' | 'instagram' | 'watermarkEnabled'>

export type BrandAssetType = 'avatar' | 'logo' | 'watermark'

export const profileApi = {
  get: () => api<Profile>('/api/admin/profile'),
  update: (data: ProfileUpdate) =>
    api<{ success: boolean }>('/api/admin/profile', { method: 'PATCH', body: data }),
  // POST /api/admin/upload-brand-asset — multipart: type (avatar | logo | watermark), file (JPEG, PNG, WEBP)
  uploadBrandAsset: (type: BrandAssetType, file: File) => {
    const formData = new FormData()
    formData.append('type', type)
    formData.append('file', file)
    return api<{ url: string }>('/api/admin/upload-brand-asset', { method: 'POST', formData })
  },
}
