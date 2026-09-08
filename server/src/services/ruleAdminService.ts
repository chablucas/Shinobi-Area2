import { prisma } from '../config/prisma.js'
import { refreshCombatRuleOverlay } from './adminOverlayService.js'
import { getBaseCombatRules, getCombatRules, isBaseCombatRule } from '../game/rules/combatRuleStore.js'
import { teamAuctionRules } from '../game/teamAuctionRules.js'
import { TEAM_AUCTION_SETTINGS } from '../game/teamAuctionSettings.js'
import type { CombatRule } from './gameDataService.js'

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode })
}

const PHASES = ['VALIDATION_PENALTY', 'MODIFIER']
const OPERATIONS = ['POINT_ADD', 'PERCENT_ADD', 'SET_FINAL', 'DISABLE_POWER']
const SIDES = ['SELF', 'OPPONENT']

function normalizeConditions(raw: unknown, group: string): CombatRule['activation']['all'] {
  if (raw === undefined || raw === null) return undefined
  if (!Array.isArray(raw)) throw httpError(`Groupe de conditions « ${group} » invalide.`, 400)
  return raw.map((entry) => {
    const condition = entry as Record<string, unknown>
    if (typeof condition.field !== 'string' || !condition.field.trim()) throw httpError('Champ de condition requis.', 400)
    if (typeof condition.operator !== 'string' || !condition.operator.trim()) throw httpError('Opérateur de condition requis.', 400)
    const side = typeof condition.side === 'string' && SIDES.includes(condition.side) ? condition.side : 'SELF'
    return {
      side: side as 'SELF' | 'OPPONENT',
      slot: typeof condition.slot === 'string' && condition.slot ? condition.slot : 'ANY',
      field: condition.field,
      operator: condition.operator,
      value: condition.value ?? null,
    }
  })
}

function normalizeRule(ruleId: string, input: Record<string, unknown>): CombatRule {
  if (typeof input.name !== 'string' || !input.name.trim()) throw httpError('Nom de règle requis.', 400)
  const phase = typeof input.phase === 'string' && PHASES.includes(input.phase) ? input.phase : 'MODIFIER'
  const effects = Array.isArray(input.effects) ? input.effects : []
  if (!effects.length) throw httpError('Au moins un effet est requis.', 400)

  const normalizedEffects = effects.map((entry) => {
    const effect = entry as Record<string, unknown>
    if (typeof effect.operation !== 'string' || !OPERATIONS.includes(effect.operation)) throw httpError('Opération d’effet invalide.', 400)
    if (typeof effect.stat !== 'string' || !effect.stat.trim()) throw httpError('Statistique d’effet requise.', 400)
    const value = effect.value === null || effect.value === undefined ? null : Number(effect.value)
    if (value !== null && !Number.isFinite(value)) throw httpError('Valeur d’effet invalide.', 400)
    const side = typeof effect.side === 'string' && SIDES.includes(effect.side) ? effect.side : 'SELF'
    return {
      side: side as 'SELF' | 'OPPONENT',
      slot: typeof effect.slot === 'string' && effect.slot ? effect.slot : effect.stat,
      stat: effect.stat,
      operation: effect.operation,
      value,
    }
  })

  const activation = (input.activation ?? {}) as Record<string, unknown>
  const rule: CombatRule = {
    id: ruleId,
    name: input.name.trim(),
    enabled: input.enabled !== false,
    phase,
    priority: Number.isFinite(Number(input.priority)) ? Number(input.priority) : 100,
    activation: {
      all: normalizeConditions(activation.all, 'all'),
      any: normalizeConditions(activation.any, 'any'),
      none: normalizeConditions(activation.none, 'none'),
      anyFailure: normalizeConditions(activation.anyFailure, 'anyFailure'),
    },
    effects: normalizedEffects,
  }
  if (Array.isArray(input.notes)) rule.notes = input.notes.map((note) => String(note))
  return rule
}

function slugifyRuleId(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'REGLE'
}

export async function listClassicRules() {
  const overrides = await prisma.combatRuleOverride.findMany({ select: { ruleId: true, custom: true, deleted: true, enabled: true } })
  const overrideById = new Map(overrides.map((override) => [override.ruleId, override]))
  return getCombatRules()
    .map((rule) => ({
      ...rule,
      source: overrideById.get(rule.id)?.custom ? 'CUSTOM' : isBaseCombatRule(rule.id) ? 'CANONICAL' : 'CUSTOM',
      overridden: overrideById.has(rule.id),
    }))
    .sort((left, right) => right.priority - left.priority)
}

export async function createClassicRule(input: Record<string, unknown>) {
  const requestedId = typeof input.id === 'string' && input.id.trim() ? input.id.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_') : slugifyRuleId(String(input.name ?? ''))
  if (getCombatRules().some((rule) => rule.id === requestedId)) throw httpError(`Une règle porte déjà l’identifiant ${requestedId}.`, 409)
  const rule = normalizeRule(requestedId, input)
  await prisma.combatRuleOverride.upsert({
    where: { ruleId: requestedId },
    create: { ruleId: requestedId, definition: rule as unknown as object, enabled: rule.enabled, custom: true, deleted: false },
    update: { definition: rule as unknown as object, enabled: rule.enabled, custom: true, deleted: false },
  })
  await refreshCombatRuleOverlay()
  return rule
}

export async function updateClassicRule(ruleId: string, input: Record<string, unknown>) {
  const existing = getCombatRules().find((rule) => rule.id === ruleId)
  if (!existing) throw httpError('Règle inconnue.', 404)
  const rule = normalizeRule(ruleId, input)
  await prisma.combatRuleOverride.upsert({
    where: { ruleId },
    create: { ruleId, definition: rule as unknown as object, enabled: rule.enabled, custom: !isBaseCombatRule(ruleId), deleted: false },
    update: { definition: rule as unknown as object, enabled: rule.enabled, deleted: false },
  })
  await refreshCombatRuleOverlay()
  return rule
}

export async function setClassicRuleEnabled(ruleId: string, enabled: unknown) {
  const existing = getCombatRules().find((rule) => rule.id === ruleId)
  if (!existing) throw httpError('Règle inconnue.', 404)
  if (typeof enabled !== 'boolean') throw httpError('État actif/inactif invalide.', 400)
  await prisma.combatRuleOverride.upsert({
    where: { ruleId },
    create: { ruleId, enabled, custom: !isBaseCombatRule(ruleId), deleted: false },
    update: { enabled },
  })
  await refreshCombatRuleOverlay()
  return { ...existing, enabled }
}

export async function deleteClassicRule(ruleId: string) {
  const existing = getCombatRules().find((rule) => rule.id === ruleId)
  if (!existing) throw httpError('Règle inconnue.', 404)
  if (isBaseCombatRule(ruleId)) {
    // Une règle canonique du fichier classic.json n'est jamais supprimée : elle est désactivée.
    await prisma.combatRuleOverride.upsert({ where: { ruleId }, create: { ruleId, enabled: false, custom: false, deleted: false }, update: { enabled: false } })
  } else {
    await prisma.combatRuleOverride.upsert({ where: { ruleId }, create: { ruleId, deleted: true, custom: true }, update: { deleted: true } })
  }
  await refreshCombatRuleOverlay()
  return { removed: !isBaseCombatRule(ruleId) }
}

export async function restoreClassicRule(ruleId: string) {
  if (!isBaseCombatRule(ruleId)) throw httpError('Seules les règles canoniques peuvent être restaurées.', 400)
  await prisma.combatRuleOverride.deleteMany({ where: { ruleId } })
  await refreshCombatRuleOverlay()
  return getBaseCombatRules().find((rule) => rule.id === ruleId)
}

export function getTeamRules() {
  return {
    settings: TEAM_AUCTION_SETTINGS,
    rules: teamAuctionRules,
  }
}
