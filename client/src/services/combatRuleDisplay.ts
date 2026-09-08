export type DisplayableAppliedRule = {
  ruleId: string
  label: string
  target: string
  operation: string
  value: number
  before: number
  after: number
}

export function appliedRuleTone(rule: DisplayableAppliedRule): 'bonus' | 'malus' | 'neutral' {
  if (rule.after > rule.before) return 'bonus'
  if (rule.after < rule.before) return 'malus'
  return 'neutral'
}

export function appliedRuleSentence(rule: DisplayableAppliedRule): string {
  if (rule.ruleId === 'ZETSU_BLANC_BODY_SWAP') {
    return `${rule.label} — Échange Body : ${rule.before} → ${rule.after}`
  }
  if (rule.ruleId === 'NO_AVATAR_FINAL_PENALTY') {
    return `${rule.label} — -10 % sur le personnage final`
  }
  return `${rule.label} — ${rule.target} : ${rule.before} → ${rule.after}`
}
