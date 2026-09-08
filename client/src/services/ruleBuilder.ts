import type { ClassicRule, RuleCondition, RuleEffect } from './ruleAdminApi'

// Catégories de placement/statistiques utilisées par le moteur (server/src/game/gameEngine.ts STAT_KEYS
// + slots des règles classic.json). Garder synchronisé si de nouvelles catégories apparaissent.
export const RULE_CATEGORIES = [
  { value: 'chakra', label: 'Chakra' },
  { value: 'invocation', label: 'Invocation' },
  { value: 'iq', label: 'IQ' },
  { value: 'ninjutsu', label: 'Ninjutsu' },
  { value: 'genjutsu', label: 'Genjutsu' },
  { value: 'taijutsu', label: 'Taijutsu' },
  { value: 'avatar', label: 'Avatar' },
  { value: 'body', label: 'Body' },
  { value: 'fuinjutsu', label: 'Fūinjutsu' },
  { value: 'senjutsu', label: 'Senjutsu' },
  { value: 'kenjutsu', label: 'Kenjutsu' },
  { value: 'clan', label: 'Clan' },
  { value: 'speed', label: 'Vitesse' },
  { value: 'kekkeiGenkai', label: 'Kekkei Genkai' },
  { value: 'kekkeiMora', label: 'Kekkei Mōra' },
] as const

const SIMPLE_CONDITION_FIELDS = new Set(['card.slug', 'card.powerIds', 'card.physicalTraitIds', 'card.clans', 'selectedAvatar.id'])
const SIMPLE_CONDITION_OPERATORS = new Set(['EQUALS', 'IN', 'CONTAINS', 'CONTAINS_ANY'])

export function categoryLabel(value: string): string {
  return RULE_CATEGORIES.find((category) => category.value === value)?.label ?? value
}

export type RuleFormModel = {
  id: string
  name: string
  enabled: boolean
  type: 'BOOST' | 'NERF'
  value: number
  unit: 'POINTS' | 'PERCENT'
  affectedCategories: string[]
  placementCategory: string
  characterSlugs: string[]
  requiredPowerIds: string[]
  requiredTraitIds: string[]
  requiredClans: string[]
  requiredAvatarIds: string[]
}

export function emptyRuleForm(): RuleFormModel {
  return {
    id: '',
    name: '',
    enabled: true,
    type: 'BOOST',
    value: 10,
    unit: 'PERCENT',
    affectedCategories: [],
    placementCategory: '',
    characterSlugs: [],
    requiredPowerIds: [],
    requiredTraitIds: [],
    requiredClans: [],
    requiredAvatarIds: [],
  }
}

// Une règle est "simple" (éditable via le formulaire visuel) si elle suit exactement le schéma
// généré par ce formulaire : phase MODIFIER, un seul groupe "all", effets homogènes côté SELF.
export function isSimpleRule(rule: ClassicRule): boolean {
  if (rule.phase !== 'MODIFIER') return false
  const activation = rule.activation ?? {}
  if ((activation.any?.length ?? 0) > 0 || (activation.none?.length ?? 0) > 0 || (activation.anyFailure?.length ?? 0) > 0) return false
  const conditions = activation.all ?? []
  if (!conditions.every((condition) => condition.side === 'SELF' && SIMPLE_CONDITION_FIELDS.has(condition.field) && SIMPLE_CONDITION_OPERATORS.has(condition.operator))) return false
  if (new Set(conditions.map((condition) => condition.slot)).size > 1) return false
  if (!rule.effects.length) return false
  const firstEffect = rule.effects[0]
  if (!firstEffect) return false
  if (!['PERCENT_ADD', 'POINT_ADD'].includes(firstEffect.operation)) return false
  const firstSign = Math.sign(firstEffect.value ?? 0) || 1
  return rule.effects.every((effect) => effect.side === 'SELF' && effect.operation === firstEffect.operation && (Math.sign(effect.value ?? 0) || 1) === firstSign)
}

function conditionValues(conditions: RuleCondition[], field: string): string[] {
  const condition = conditions.find((entry) => entry.field === field)
  if (!condition) return []
  return Array.isArray(condition.value) ? condition.value.map(String) : [String(condition.value)]
}

export function ruleToFormModel(rule: ClassicRule): RuleFormModel {
  const conditions = rule.activation?.all ?? []
  const firstEffect = rule.effects[0]
  const rawValue = firstEffect?.value ?? 0
  return {
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    type: rawValue < 0 ? 'NERF' : 'BOOST',
    value: Math.abs(rawValue),
    unit: firstEffect?.operation === 'PERCENT_ADD' ? 'PERCENT' : 'POINTS',
    affectedCategories: Array.from(new Set(rule.effects.map((effect) => effect.slot))),
    placementCategory: conditions.find((condition) => condition.slot && condition.slot !== 'ANY')?.slot ?? '',
    characterSlugs: conditionValues(conditions, 'card.slug'),
    requiredPowerIds: conditionValues(conditions, 'card.powerIds'),
    requiredTraitIds: conditionValues(conditions, 'card.physicalTraitIds'),
    requiredClans: conditionValues(conditions, 'card.clans'),
    requiredAvatarIds: conditionValues(conditions, 'selectedAvatar.id'),
  }
}

export function formModelToRulePayload(form: RuleFormModel): Partial<ClassicRule> {
  const signedValue = form.type === 'NERF' ? -Math.abs(form.value) : Math.abs(form.value)
  const operation = form.unit === 'PERCENT' ? 'PERCENT_ADD' : 'POINT_ADD'
  const placementSlot = form.placementCategory || 'ANY'

  const conditions: RuleCondition[] = []
  if (form.characterSlugs.length) conditions.push({ side: 'SELF', slot: placementSlot, field: 'card.slug', operator: 'IN', value: form.characterSlugs })
  if (form.requiredPowerIds.length) conditions.push({ side: 'SELF', slot: placementSlot, field: 'card.powerIds', operator: 'CONTAINS_ANY', value: form.requiredPowerIds })
  if (form.requiredTraitIds.length) conditions.push({ side: 'SELF', slot: placementSlot, field: 'card.physicalTraitIds', operator: 'CONTAINS_ANY', value: form.requiredTraitIds })
  if (form.requiredClans.length) conditions.push({ side: 'SELF', slot: placementSlot, field: 'card.clans', operator: 'IN', value: form.requiredClans })
  if (form.requiredAvatarIds.length) conditions.push({ side: 'SELF', slot: placementSlot, field: 'selectedAvatar.id', operator: 'IN', value: form.requiredAvatarIds })

  const effects: RuleEffect[] = form.affectedCategories.map((category) => ({ side: 'SELF', slot: category, stat: category, operation, value: signedValue }))

  return {
    id: form.id || undefined,
    name: form.name.trim(),
    enabled: form.enabled,
    phase: 'MODIFIER',
    priority: 100,
    activation: { all: conditions },
    effects,
  }
}

export type RuleLabelLookups = {
  nameBySlug?: Record<string, string>
  powerLabels?: Record<string, { label: string }>
  traitLabels?: Record<string, { label: string }>
  avatarNameById?: Record<string, string>
}

function joinLabels(values: string[], labels?: Record<string, { label: string } | undefined> | Record<string, string | undefined>): string {
  if (!values.length) return ''
  return values
    .map((value) => {
      const entry = labels?.[value]
      if (!entry) return value
      return typeof entry === 'string' ? entry : entry.label
    })
    .join(', ')
}

// Traduit une règle enregistrée en phrase lisible, ex. :
// "Nouveau pouvoir — Boost de 10 % sur Chakra et Body si Minato est placé en Ninjutsu."
export function ruleSentence(rule: ClassicRule, lookups: RuleLabelLookups = {}): string {
  const conditions = rule.activation?.all ?? []
  const affected = Array.from(new Set(rule.effects.map((effect) => categoryLabel(effect.slot)))).join(', ') || 'aucune catégorie'
  const firstEffect = rule.effects[0]
  const kind = (firstEffect?.value ?? 0) < 0 ? 'Nerf' : 'Boost'
  const magnitude = Math.abs(firstEffect?.value ?? 0)
  const unit = firstEffect?.operation === 'PERCENT_ADD' ? '%' : 'points'

  const characterSlugs = conditionValues(conditions, 'card.slug')
  const placementSlot = conditions.find((condition) => condition.slot && condition.slot !== 'ANY')?.slot
  const powerIds = conditionValues(conditions, 'card.powerIds')
  const traitIds = conditionValues(conditions, 'card.physicalTraitIds')
  const clans = conditionValues(conditions, 'card.clans')
  const avatarIds = conditionValues(conditions, 'selectedAvatar.id')

  const extraConditions: string[] = []
  if (characterSlugs.length) {
    const names = joinLabels(characterSlugs, lookups.nameBySlug ? Object.fromEntries(Object.entries(lookups.nameBySlug).map(([slug, name]) => [slug, name])) : undefined)
    const placementText = placementSlot ? `placé(s) en ${categoryLabel(placementSlot)}` : 'en jeu'
    extraConditions.push(`${names} est/sont ${placementText}`)
  } else if (placementSlot) {
    extraConditions.push(`un personnage est placé en ${categoryLabel(placementSlot)}`)
  }
  if (clans.length) extraConditions.push(`le clan est ${joinLabels(clans)}`)
  if (powerIds.length) extraConditions.push(`le pouvoir ${joinLabels(powerIds, lookups.powerLabels)} est présent`)
  if (traitIds.length) extraConditions.push(`le trait ${joinLabels(traitIds, lookups.traitLabels)} est présent`)
  if (avatarIds.length) extraConditions.push(`l'avatar ${joinLabels(avatarIds, lookups.avatarNameById)} est sélectionné`)

  const conditionText = extraConditions.length ? ` si ${extraConditions.join(' et ')}` : ''
  return `${rule.name} — ${kind} de ${magnitude} ${unit} sur ${affected}${conditionText}.`
}
