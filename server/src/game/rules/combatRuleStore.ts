import { rules as baseRules, type CombatRule } from '../../services/gameDataService.js'

export type CombatRuleOverrideRecord = {
  ruleId: string
  definition: unknown
  enabled: boolean | null
  deleted: boolean
  custom: boolean
}

// Overlay mémoire des règles éditées en administration (table CombatRuleOverride).
let overrides: CombatRuleOverrideRecord[] = []
let effectiveRules: CombatRule[] = [...baseRules]

function rebuild(): void {
  const byId = new Map<string, CombatRule>(baseRules.map((rule) => [rule.id, { ...rule }]))
  for (const override of overrides) {
    if (override.deleted) {
      byId.delete(override.ruleId)
      continue
    }
    const definition = override.definition && typeof override.definition === 'object' ? (override.definition as CombatRule) : null
    const base = byId.get(override.ruleId)
    if (!definition && !base) continue
    const merged = { ...(base ?? ({} as CombatRule)), ...(definition ?? {}), id: override.ruleId }
    if (override.enabled !== null) merged.enabled = override.enabled
    byId.set(override.ruleId, merged)
  }
  effectiveRules = [...byId.values()]
}

export function setCombatRuleOverrides(records: CombatRuleOverrideRecord[]): void {
  overrides = records
  rebuild()
}

export function getCombatRules(): CombatRule[] {
  return effectiveRules
}

export function getBaseCombatRules(): CombatRule[] {
  return baseRules
}

export function isBaseCombatRule(ruleId: string): boolean {
  return baseRules.some((rule) => rule.id === ruleId)
}

rebuild()
