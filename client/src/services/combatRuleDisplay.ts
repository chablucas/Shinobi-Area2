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
    return `Aucun Avatar valide — Score final : ${formatCleanScore(rule.before)} → -15% → ${formatCleanScore(rule.after)}`
  }
  return `${rule.label} — ${rule.target} : ${rule.before} → ${rule.after}`
}

// Round to 2 decimals and drop trailing zeros (1000 stays "1000", 628.1075 becomes "628.11")
function formatCleanScore(value: number): string {
  return Number(value.toFixed(2)).toString()
}
