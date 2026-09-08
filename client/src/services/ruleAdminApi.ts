import { API_BASE_URL } from './cardApi'

export type RuleCondition = {
  side: 'SELF' | 'OPPONENT'
  slot: string
  field: string
  operator: string
  value: unknown
}

export type RuleEffect = {
  side: 'SELF' | 'OPPONENT'
  slot: string
  stat: string
  operation: string
  value: number | null
}

export type ClassicRule = {
  id: string
  name: string
  enabled: boolean
  phase: string
  priority: number
  activation: {
    all?: RuleCondition[]
    any?: RuleCondition[]
    none?: RuleCondition[]
    anyFailure?: RuleCondition[]
  }
  effects: RuleEffect[]
  notes?: string[]
  source?: 'CANONICAL' | 'CUSTOM'
  overridden?: boolean
}

export type TeamRulesPayload = {
  settings: Record<string, unknown>
  rules: {
    minBid: number
    bidUnit: number
    openingBid: number
    allowAllIn: boolean
    allowPass: boolean
    passIsFinalForCurrentCard: boolean
    rotation: Record<string, string[]>
    scoring: {
      character: { method: string; minimum: number; maximum: number }
      team: { method: string }
      victory: { method: string }
      tiebreak: { method: string }
    }
    ai: Record<string, number>
  }
}

async function ruleRequest<T>(token: string, path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/admin/rules${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers ?? {}) } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error ?? 'Action administrateur impossible.')
  return payload as T
}

export const fetchClassicRules = (token: string) => ruleRequest<ClassicRule[]>(token, '/classic')
export const createClassicRule = (token: string, rule: Partial<ClassicRule>) => ruleRequest<ClassicRule>(token, '/classic', { method: 'POST', body: JSON.stringify(rule) })
export const updateClassicRule = (token: string, ruleId: string, rule: Partial<ClassicRule>) => ruleRequest<ClassicRule>(token, `/classic/${encodeURIComponent(ruleId)}`, { method: 'PUT', body: JSON.stringify(rule) })
export const setClassicRuleEnabled = (token: string, ruleId: string, enabled: boolean) => ruleRequest<ClassicRule>(token, `/classic/${encodeURIComponent(ruleId)}/enabled`, { method: 'PATCH', body: JSON.stringify({ enabled }) })
export const deleteClassicRule = (token: string, ruleId: string) => ruleRequest<{ removed: boolean }>(token, `/classic/${encodeURIComponent(ruleId)}`, { method: 'DELETE' })
export const restoreClassicRule = (token: string, ruleId: string) => ruleRequest<ClassicRule>(token, `/classic/${encodeURIComponent(ruleId)}/restore`, { method: 'POST' })
export const fetchTeamRules = (token: string) => ruleRequest<TeamRulesPayload>(token, '/team')
