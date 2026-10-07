import { API_BASE_URL } from './cardApi'

export type User = {
  id: number
  email: string
  displayName: string
  avatarUrl: string | null
  avatarCloudinaryPublicId: string | null
  wins: number
  losses: number
  role: 'USER' | 'ADMIN'
  createdAt: string
  updatedAt: string
}
type AuthResponse = { token: string; user: User }

export class AuthApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'AuthApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) } })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new AuthApiError(payload.error ?? 'Une erreur est survenue.', response.status)
  return payload as T
}

export function register(email: string, password: string, displayName: string) { return request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName }) }) }
export function login(email: string, password: string) { return request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }) }
export function getMe(token: string) { return request<User>('/auth/me', { headers: { Authorization: `Bearer ${token}` } }) }
export function updateProfile(token: string, displayName: string) { return request<User>('/users/me', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ displayName }) }) }
export function recordResult(token: string, gameId: string, won: boolean) { return request<{ recorded: boolean }>('/users/me/results', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ gameId, won }) }) }

export async function uploadAvatar(
  token: string,
  file: File
): Promise<User> {
  const formData = new FormData()

  formData.append('avatar', file)

  const response = await fetch(
    `${API_BASE_URL}/users/me/avatar`,
    {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${token}`,
      },

      body: formData,
    }
  )

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new AuthApiError(
      payload.error ?? "Impossible de modifier l'avatar.",
      response.status
    )
  }

  return payload as User
}