import type { Card } from '../types/card'
import { API_BASE_URL } from './cardApi'

export type TeamScoreEntry = {
  slug: string
  name: string
  score: number
  baseScore: number
  overridden: boolean
}

async function adminRequest<T>(token: string, path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/admin/cards${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers ?? {}) } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error ?? 'Action administrateur impossible.')
  return payload as T
}

export const fetchAdminCard = (token: string, slug: string) => adminRequest<Card>(token, `/${encodeURIComponent(slug)}`)
export const fetchCreatorStatKeys = (token: string) => adminRequest<string[]>(token, '/stat-keys')
export const saveCardStats = (token: string, slug: string, stats: Record<string, number>) => adminRequest<Card>(token, `/${encodeURIComponent(slug)}/stats`, { method: 'PUT', body: JSON.stringify({ stats }) })
export const resetCardStats = (token: string, slug: string) => adminRequest<Card>(token, `/${encodeURIComponent(slug)}/stats`, { method: 'DELETE' })
export const saveRarityOverride = (token: string, slug: string, rarity: string) => adminRequest<unknown>(token, `/${encodeURIComponent(slug)}/rarity`, { method: 'PUT', body: JSON.stringify({ rarity }) })
export const resetRarityOverride = (token: string, slug: string) => adminRequest<void>(token, `/${encodeURIComponent(slug)}/rarity`, { method: 'DELETE' })

export const fetchTeamScores = (token: string) => adminRequest<TeamScoreEntry[]>(token, '/team-scores')
export const saveTeamScores = (token: string, scores: Array<{ slug: string; score: number }>) => adminRequest<TeamScoreEntry[]>(token, '/team-scores', { method: 'PUT', body: JSON.stringify({ scores }) })
export const resetTeamScore = (token: string, slug: string) => adminRequest<TeamScoreEntry[]>(token, `/team-scores/${encodeURIComponent(slug)}`, { method: 'DELETE' })