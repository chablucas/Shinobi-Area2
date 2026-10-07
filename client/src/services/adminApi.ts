import { API_BASE_URL } from './cardApi'

export type AdminOverview = {
  totalUsers: number
  totalAdmins: number
  totalPending: number
  totalApproved: number
  totalBlocked: number
}

export type AdminUser = {
  id: number
  email: string
  displayName: string
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  accessStatus: 'PENDING' | 'APPROVED' | 'BLOCKED'
  blockedAt: string | null
  wins: number
  losses: number
  createdAt: string
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...(options.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      payload.error ?? 'Action impossible.'
    )
  }

  return payload as T
}

export async function fetchAdminOverview(token: string) {
  return request<AdminOverview>(
    '/admin/overview',
    {},
    token
  )
}

export async function fetchAdminUsers(
  token: string,
  search = ''
) {
  const params = new URLSearchParams()

  if (search.trim()) {
    params.set('search', search.trim())
  }

  return request<AdminUser[]>(
    `/admin/users${
      params.toString()
        ? `?${params.toString()}`
        : ''
    }`,
    {},
    token
  )
}

export function approveAdminUser(
  token: string,
  userId: number
) {
  return request<AdminUser>(
    `/admin/users/${userId}/approve`,
    {
      method: 'PATCH',
    },
    token
  )
}

export function deletePendingAdminUser(
  token: string,
  userId: number
) {
  return request<{ deleted: boolean; userId: number }>(
    `/admin/users/${userId}/pending`,
    {
      method: 'DELETE',
    },
    token
  )
}

export function updateAdminUserRole(
  token: string,
  userId: number,
  role: 'USER' | 'ADMIN'
) {
  return request<AdminUser>(
    `/admin/users/${userId}/role`,
    {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    },
    token
  )
}

export function updateAdminUserBlocked(
  token: string,
  userId: number,
  blocked: boolean
) {
  return request<AdminUser>(
    `/admin/users/${userId}/blocked`,
    {
      method: 'PATCH',
      body: JSON.stringify({ blocked }),
    },
    token
  )
}