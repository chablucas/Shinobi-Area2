import { prisma } from '../config/prisma.js'
import { getEffectiveCard } from './cardService.js'
import { refreshCardStatOverlay, refreshTeamScoreOverlay } from './adminOverlayService.js'
import { getCardKnowledgeBySlug, listCardKnowledge, rarityOrder } from '../game/cardKnowledge.js'
import { listTeamAuctionPower } from '../game/teamAuctionPower.js'
import { resolveCanonicalSlug } from '../game/cardCatalog.js'

// Clés de statistiques dérivées du fichier canonique shinobi-cards-data.json (mode « Créer ton perso »).
export const CREATOR_STAT_KEYS: string[] = Array.from(new Set(listCardKnowledge().flatMap((card) => Object.keys(card.stats))))

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode })
}

function assertCard(slug: string) {
  if (!getCardKnowledgeBySlug(slug)) throw httpError('Carte inconnue.', 404)
}

function assertStatValue(statKey: string, value: unknown) {
  if (!CREATOR_STAT_KEYS.includes(statKey)) throw httpError(`Statistique inconnue : ${statKey}.`, 400)
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 100) throw httpError('Valeur de statistique invalide (0-100).', 400)
}

export async function updateStat(slug: string, statKey: string, value: unknown) {
  assertCard(slug)
  assertStatValue(statKey, value)
  const canonicalSlug = resolveCanonicalSlug(slug)
  const saved = await prisma.cardStatOverride.upsert({
    where: { cardSlug_statKey: { cardSlug: canonicalSlug, statKey } },
    create: { cardSlug: canonicalSlug, statKey, value: Number(value) },
    update: { value: Number(value) },
  })
  await refreshCardStatOverlay()
  return saved
}

export async function updateStats(slug: string, stats: unknown) {
  assertCard(slug)
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) throw httpError('Statistiques invalides.', 400)
  const entries = Object.entries(stats as Record<string, unknown>)
  if (!entries.length) throw httpError('Aucune statistique à enregistrer.', 400)
  for (const [statKey, value] of entries) assertStatValue(statKey, value)

  const canonicalSlug = resolveCanonicalSlug(slug)
  await prisma.$transaction(entries.map(([statKey, value]) => prisma.cardStatOverride.upsert({
    where: { cardSlug_statKey: { cardSlug: canonicalSlug, statKey } },
    create: { cardSlug: canonicalSlug, statKey, value: Number(value) },
    update: { value: Number(value) },
  })))
  await refreshCardStatOverlay()
  return getEffectiveCard(canonicalSlug)
}

export async function deleteStat(slug: string, statKey: string) {
  await prisma.cardStatOverride.deleteMany({ where: { cardSlug: resolveCanonicalSlug(slug), statKey } })
  await refreshCardStatOverlay()
}

export async function resetCardStats(slug: string) {
  assertCard(slug)
  const canonicalSlug = resolveCanonicalSlug(slug)
  await prisma.cardStatOverride.deleteMany({ where: { cardSlug: canonicalSlug } })
  await refreshCardStatOverlay()
  return getEffectiveCard(canonicalSlug)
}

export async function updateRarity(slug: string, rarity: unknown) {
  assertCard(slug)
  if (!rarityOrder.some((item) => item.id === rarity)) throw httpError('Rareté invalide.', 400)
  const canonicalSlug = resolveCanonicalSlug(slug)
  return prisma.cardRarityOverride.upsert({ where: { cardSlug: canonicalSlug }, create: { cardSlug: canonicalSlug, rarity: String(rarity) }, update: { rarity: String(rarity) } })
}

export async function deleteRarity(slug: string) {
  await prisma.cardRarityOverride.deleteMany({ where: { cardSlug: resolveCanonicalSlug(slug) } })
}

export function listTeamScores() {
  return listTeamAuctionPower()
    .map((entry) => ({ slug: entry.slug, name: entry.name, score: entry.generalScore, baseScore: entry.baseScore ?? entry.generalScore, overridden: entry.overridden === true }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

export async function updateTeamScore(slug: string, score: unknown) {
  assertCard(slug)
  if (!Number.isInteger(score) || Number(score) < 0 || Number(score) > 100) throw httpError('Note Team invalide (0-100).', 400)
  const canonicalSlug = resolveCanonicalSlug(slug)
  const saved = await prisma.teamAuctionScoreOverride.upsert({
    where: { cardSlug: canonicalSlug },
    create: { cardSlug: canonicalSlug, score: Number(score) },
    update: { score: Number(score) },
  })
  await refreshTeamScoreOverlay()
  return saved
}

export async function updateTeamScores(entries: unknown) {
  if (!Array.isArray(entries) || !entries.length) throw httpError('Aucune note Team à enregistrer.', 400)
  const normalized = entries.map((entry) => {
    const record = entry as { slug?: unknown; score?: unknown }
    const slug = typeof record.slug === 'string' ? resolveCanonicalSlug(record.slug) : ''
    if (!slug) throw httpError('Slug Team invalide.', 400)
    assertCard(slug)
    if (!Number.isInteger(record.score) || Number(record.score) < 0 || Number(record.score) > 100) throw httpError(`Note Team invalide pour ${slug} (0-100).`, 400)
    return { slug, score: Number(record.score) }
  })

  await prisma.$transaction(normalized.map(({ slug, score }) => prisma.teamAuctionScoreOverride.upsert({ where: { cardSlug: slug }, create: { cardSlug: slug, score }, update: { score } })))
  await refreshTeamScoreOverlay()
  return listTeamScores()
}

export async function resetTeamScore(slug: string) {
  await prisma.teamAuctionScoreOverride.deleteMany({ where: { cardSlug: resolveCanonicalSlug(slug) } })
  await refreshTeamScoreOverlay()
  return listTeamScores()
}

export { getEffectiveCard }