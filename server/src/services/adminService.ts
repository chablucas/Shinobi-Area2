import { prisma } from '../config/prisma.js'
import { getCardKnowledgeBySlug } from '../game/cardKnowledge.js'

export async function promoteAdminByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (!user) {
    return { promoted: false, email: normalizedEmail, reason: 'USER_NOT_FOUND' as const }
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { role: 'ADMIN' },
    select: { id: true, email: true, displayName: true, role: true },
  })

  return { promoted: true, email: normalizedEmail, user: updatedUser }
}

export async function getAdminOverview() {
  const [totalUsers, totalAdmins, totalBlocked] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { blockedAt: { not: null } } }),
  ])

  return { totalUsers, totalAdmins, totalBlocked }
}

export async function listAdminCards(search: string, rarity: string | null) {
  const normalizedSearch = search.trim().toLowerCase()
  const cards = await prisma.card.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, slug: true, name: true, imageUrl: true },
  })

  return cards
    .map((card) => {
      const knowledge = getCardKnowledgeBySlug(card.slug)
      const cardRarity = knowledge?.rarity ?? 'inconnu'
      return { ...card, rarity: cardRarity }
    })
    .filter((card) => {
      const matchesSearch = !normalizedSearch || card.name.toLowerCase().includes(normalizedSearch) || card.slug.toLowerCase().includes(normalizedSearch)
      const matchesRarity = !rarity || card.rarity === rarity
      return matchesSearch && matchesRarity
    })
}

const adminUserSelect = { id: true, email: true, displayName: true, role: true, blockedAt: true, wins: true, losses: true, createdAt: true } as const

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode })
}

export async function listAdminUsers(search: string) {
  const normalizedSearch = search.trim()
  const users = await prisma.user.findMany({
    where: normalizedSearch
      ? { OR: [{ email: { contains: normalizedSearch, mode: 'insensitive' } }, { displayName: { contains: normalizedSearch, mode: 'insensitive' } }] }
      : undefined,
    orderBy: { createdAt: 'desc' },
    select: adminUserSelect,
  })
  return users.map((user) => ({ ...user, blocked: user.blockedAt !== null }))
}

export async function setUserRole(actorId: number, userId: number, role: unknown) {
  if (role !== 'ADMIN' && role !== 'USER') throw httpError('Rôle invalide.', 400)
  if (actorId === userId && role !== 'ADMIN') throw httpError('Vous ne pouvez pas retirer votre propre rôle administrateur.', 400)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) throw httpError('Utilisateur introuvable.', 404)
  if (role === 'USER') {
    const remainingAdmins = await prisma.user.count({ where: { role: 'ADMIN', id: { not: userId } } })
    if (remainingAdmins === 0) throw httpError('Le site doit conserver au moins un administrateur.', 400)
  }
  const updated = await prisma.user.update({ where: { id: userId }, data: { role }, select: adminUserSelect })
  return { ...updated, blocked: updated.blockedAt !== null }
}

export async function setUserBlocked(actorId: number, userId: number, blocked: unknown) {
  if (typeof blocked !== 'boolean') throw httpError('Statut de blocage invalide.', 400)
  if (actorId === userId && blocked) throw httpError('Vous ne pouvez pas bloquer votre propre compte.', 400)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) throw httpError('Utilisateur introuvable.', 404)
  const updated = await prisma.user.update({ where: { id: userId }, data: { blockedAt: blocked ? new Date() : null }, select: adminUserSelect })
  return { ...updated, blocked: updated.blockedAt !== null }
}
