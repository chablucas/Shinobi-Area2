import { API_BASE_URL } from './cardApi'

export type AdminOverview = {
  totalUsers: number
  totalAdmins: number
  totalBlocked: number
}

export type AdminUser = {
  id: number
  email: string
  displayName: string
  role: 'USER' | 'ADMIN'
  blocked: boolean
  blockedAt: string | null
  wins: number
  losses: number
  createdAt: string
}

export type AdminCardSummary = {
  id: number
  slug: string
  name: string
  imageUrl: string | null
  rarity: string
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error ?? 'Action impossible.')
  return payload as T
}

export function fetchAdminOverview(token: string) {
  return request<AdminOverview>('/admin/overview', {}, token)
}

export function fetchAdminCards(token: string, search = '', rarity = '') {
  const params = new URLSearchParams()
  if (search.trim()) params.set('search', search.trim())
  if (rarity.trim()) params.set('rarity', rarity.trim())
  return request<AdminCardSummary[]>(`/admin/cards${params.toString() ? `?${params.toString()}` : ''}`, {}, token)
}

export function fetchAdminUsers(token: string, search = '') {
  const params = new URLSearchParams()
  if (search.trim()) params.set('search', search.trim())
  return request<AdminUser[]>(`/admin/users${params.toString() ? `?${params.toString()}` : ''}`, {}, token)
}

export function updateAdminUserRole(token: string, userId: number, role: 'USER' | 'ADMIN') {
  return request<AdminUser>(`/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }, token)
}

export function updateAdminUserBlocked(token: string, userId: number, blocked: boolean) {
  return request<AdminUser>(`/admin/users/${userId}/blocked`, { method: 'PATCH', body: JSON.stringify({ blocked }) }, token)
}
