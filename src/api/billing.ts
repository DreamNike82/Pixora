import { api } from './client'

// POST /checkout { tier, interval }. У документації є лише приклад "PRO" / "month"; STUDIO і "year" — припущення, уточніть у бекендера.
export type CheckoutTier = 'PRO' | 'STUDIO'
export type BillingInterval = 'month' | 'year'

export type BillingStatus = { tier: string; active: boolean; expiresAt?: string | null }
export type StorageUsage = { usedBytes: number; limitBytes: number }

export const billingApi = {
  checkout: (tier: CheckoutTier, interval: BillingInterval = 'month') =>
    api<{ url: string }>('/api/admin/billing/checkout', { method: 'POST', body: { tier, interval } }),
  portal: () => api<{ url: string }>('/api/admin/billing/portal', { method: 'POST' }),
  status: () => api<BillingStatus>('/api/admin/billing/status'),
  syncSession: () => api<{ success: boolean }>('/api/admin/billing/sync-session', { method: 'POST' }),
  syncStorage: () => api<StorageUsage>('/api/admin/billing/sync-storage', { method: 'POST' }),
}
