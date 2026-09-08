import type { Card } from '../types/card'
import { API_BASE_URL } from './cardApi'

export type TeamScoreEntry = {
  slug: string
  name: string
  score: number
  baseScore: number
  overridden: boolean
}

// Lecture : accessible sans jeton (page Cartes publique). Écriture : jeton ADMIN requis, vérifié côté serveur.
async function cardAdminRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/admin/cards${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error ?? 'Action impossible.')
  return payload as T
}

export const fetchCardForEdit = (slug: string, token?: string) => cardAdminRequest<Card>(`/${encodeURIComponent(slug)}`, {}, token)
export const fetchCreatorStatKeys = (token?: string) => cardAdminRequest<string[]>('/stat-keys', {}, token)
export const saveCardStats = (token: string, slug: string, stats: Record<string, number>) => cardAdminRequest<Card>(`/${encodeURIComponent(slug)}/stats`, { method: 'PUT', body: JSON.stringify({ stats }) }, token)
export const resetCardStats = (token: string, slug: string) => cardAdminRequest<Card>(`/${encodeURIComponent(slug)}/stats`, { method: 'DELETE' }, token)

export const fetchTeamScores = (token?: string) => cardAdminRequest<TeamScoreEntry[]>('/team-scores', {}, token)
export const saveTeamScores = (token: string, scores: Array<{ slug: string; score: number }>) => cardAdminRequest<TeamScoreEntry[]>('/team-scores', { method: 'PUT', body: JSON.stringify({ scores }) }, token)
export const resetTeamScore = (token: string, slug: string) => cardAdminRequest<TeamScoreEntry[]>(`/team-scores/${encodeURIComponent(slug)}`, { method: 'DELETE' }, token)