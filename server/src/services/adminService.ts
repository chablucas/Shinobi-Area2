import { prisma } from '../config/prisma.js'

// Comptes créés par les tests automatisés : jamais de vrais utilisateurs.
const TECHNICAL_ACCOUNT_FILTER = {
  email: {
    endsWith: '@example.test',
    mode: 'insensitive' as const,
  },
}

const adminUserSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  accessStatus: true,
  blockedAt: true,
  wins: true,
  losses: true,
  createdAt: true,
} as const

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode })
}

export async function promoteAdminByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  })

  if (!user) {
    return {
      promoted: false,
      email: normalizedEmail,
      reason: 'USER_NOT_FOUND' as const,
    }
  }

  if (user.role === 'SUPER_ADMIN') {
    throw httpError(
      'Le rôle SUPER_ADMIN ne peut pas être modifié.',
      403
    )
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      role: 'ADMIN',
    },
    select: adminUserSelect,
  })

  return {
    promoted: true,
    email: normalizedEmail,
    user: updatedUser,
  }
}

export async function getAdminOverview() {
  const [
    totalUsers,
    totalAdmins,
    totalPending,
    totalApproved,
    totalBlocked,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        NOT: TECHNICAL_ACCOUNT_FILTER,
      },
    }),

    prisma.user.count({
      where: {
        role: {
          in: ['ADMIN', 'SUPER_ADMIN'],
        },
        NOT: TECHNICAL_ACCOUNT_FILTER,
      },
    }),

    prisma.user.count({
      where: {
        accessStatus: 'PENDING',
        NOT: TECHNICAL_ACCOUNT_FILTER,
      },
    }),

    prisma.user.count({
      where: {
        accessStatus: 'APPROVED',
        NOT: TECHNICAL_ACCOUNT_FILTER,
      },
    }),

    prisma.user.count({
      where: {
        accessStatus: 'BLOCKED',
        NOT: TECHNICAL_ACCOUNT_FILTER,
      },
    }),
  ])

  return {
    totalUsers,
    totalAdmins,
    totalPending,
    totalApproved,
    totalBlocked,
  }
}

export async function listAdminUsers(search: string) {
  const normalizedSearch = search.trim()

  const users = await prisma.user.findMany({
    where: {
      NOT: TECHNICAL_ACCOUNT_FILTER,

      ...(normalizedSearch
        ? {
            OR: [
              {
                email: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                displayName: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    },

    orderBy: {
      createdAt: 'desc',
    },

    select: adminUserSelect,
  })

  return users
}

export async function setUserRole(
  actorId: number,
  userId: number,
  role: unknown
) {
  if (role !== 'ADMIN' && role !== 'USER') {
    throw httpError('Rôle invalide.', 400)
  }

  if (actorId === userId) {
    throw httpError(
      'Vous ne pouvez pas modifier votre propre rôle.',
      400
    )
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
    },
  })

  if (!user) {
    throw httpError('Utilisateur introuvable.', 404)
  }

  if (user.role === 'SUPER_ADMIN') {
    throw httpError(
      'Le rôle du SUPER_ADMIN ne peut pas être modifié.',
      403
    )
  }

  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      role,
    },
    select: adminUserSelect,
  })
}

export async function setUserBlocked(
  actorId: number,
  userId: number,
  blocked: unknown
) {
  if (typeof blocked !== 'boolean') {
    throw httpError('Statut de blocage invalide.', 400)
  }

  if (actorId === userId && blocked) {
    throw httpError(
      'Vous ne pouvez pas bloquer votre propre compte.',
      400
    )
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
    },
  })

  if (!user) {
    throw httpError('Utilisateur introuvable.', 404)
  }

  if (user.role === 'SUPER_ADMIN') {
    throw httpError(
      'Le compte SUPER_ADMIN ne peut pas être bloqué.',
      403
    )
  }

  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      accessStatus: blocked ? 'BLOCKED' : 'APPROVED',
      blockedAt: blocked ? new Date() : null,
    },
    select: adminUserSelect,
  })
}

// Accepter une nouvelle demande d'accès.
export async function approveUser(
  actorId: number,
  userId: number
) {
  if (actorId === userId) {
    throw httpError(
      'Vous ne pouvez pas valider votre propre compte.',
      400
    )
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      accessStatus: true,
    },
  })

  if (!user) {
    throw httpError('Utilisateur introuvable.', 404)
  }

  if (user.role === 'SUPER_ADMIN') {
    throw httpError(
      'Le compte SUPER_ADMIN ne peut pas être modifié.',
      403
    )
  }

  if (user.accessStatus !== 'PENDING') {
    throw httpError(
      "Ce compte n'est pas en attente de validation.",
      400
    )
  }

  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      accessStatus: 'APPROVED',
      blockedAt: null,
    },
    select: adminUserSelect,
  })
}

// Supprimer une demande en attente.
// L'utilisateur pourra ensuite créer une nouvelle demande.
export async function deletePendingUser(
  actorId: number,
  userId: number
) {
  if (actorId === userId) {
    throw httpError(
      'Vous ne pouvez pas supprimer votre propre compte.',
      400
    )
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      accessStatus: true,
    },
  })

  if (!user) {
    throw httpError('Utilisateur introuvable.', 404)
  }

  if (user.role === 'SUPER_ADMIN') {
    throw httpError(
      'Le compte SUPER_ADMIN ne peut pas être supprimé.',
      403
    )
  }

  if (user.accessStatus !== 'PENDING') {
    throw httpError(
      'Seuls les comptes en attente peuvent être supprimés ici.',
      400
    )
  }

  await prisma.user.delete({
    where: {
      id: userId,
    },
  })

  return {
    deleted: true,
    userId,
  }
}