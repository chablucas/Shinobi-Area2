import { prisma } from '../config/prisma.js'
import { setCardStatOverrides } from '../game/cardKnowledge.js'
import { setCombatRuleOverrides } from '../game/rules/combatRuleStore.js'
import { setTeamAuctionScoreOverrides } from '../game/teamAuctionPower.js'

export async function refreshCardStatOverlay() {
  const overrides = await prisma.cardStatOverride.findMany({ select: { cardSlug: true, statKey: true, value: true } })
  setCardStatOverrides(overrides)
}

export async function refreshTeamScoreOverlay() {
  const overrides = await prisma.teamAuctionScoreOverride.findMany({ select: { cardSlug: true, score: true } })
  setTeamAuctionScoreOverrides(overrides)
}

export async function refreshCombatRuleOverlay() {
  const overrides = await prisma.combatRuleOverride.findMany({ select: { ruleId: true, definition: true, enabled: true, deleted: true, custom: true } })
  setCombatRuleOverrides(overrides)
}

export async function refreshAllOverlays() {
  await Promise.all([refreshCardStatOverlay(), refreshTeamScoreOverlay(), refreshCombatRuleOverlay()])
}
