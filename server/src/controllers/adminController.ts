import type { Request, Response } from 'express'
import {
  approveUser,
  deletePendingUser,
  getAdminOverview,
  listAdminUsers,
  promoteAdminByEmail,
  setUserBlocked,
  setUserRole,
} from '../services/adminService.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'

export async function getAdminOverviewController(
  _request: Request,
  response: Response
) {
  response.json(await getAdminOverview())
}

export async function getAdminUsersController(
  request: Request,
  response: Response
) {
  const search =
    typeof request.query.search === 'string'
      ? request.query.search
      : ''

  response.json(await listAdminUsers(search))
}

export async function patchAdminUserRoleController(
  request: Request,
  response: Response
) {
  const actorId = (request as AuthenticatedRequest).userId

  response.json(
    await setUserRole(
      actorId,
      Number(request.params.id),
      request.body?.role
    )
  )
}

export async function patchAdminUserBlockedController(
  request: Request,
  response: Response
) {
  const actorId = (request as AuthenticatedRequest).userId

  response.json(
    await setUserBlocked(
      actorId,
      Number(request.params.id),
      request.body?.blocked
    )
  )
}

export async function approveAdminUserController(
  request: Request,
  response: Response
) {
  const actorId = (request as AuthenticatedRequest).userId
  const userId = Number(request.params.id)

  if (!Number.isInteger(userId)) {
    response.status(400).json({
      error: 'Utilisateur invalide.',
    })
    return
  }

  response.json(
    await approveUser(actorId, userId)
  )
}

export async function deletePendingAdminUserController(
  request: Request,
  response: Response
) {
  const actorId = (request as AuthenticatedRequest).userId
  const userId = Number(request.params.id)

  if (!Number.isInteger(userId)) {
    response.status(400).json({
      error: 'Utilisateur invalide.',
    })
    return
  }

  response.json(
    await deletePendingUser(actorId, userId)
  )
}

export async function promoteAdminController(
  request: Request,
  response: Response
) {
  const email =
    typeof request.body?.email === 'string'
      ? request.body.email
      : ''

  if (!email.trim()) {
    response.status(400).json({
      error: 'Un email est requis.',
    })
    return
  }

  const result = await promoteAdminByEmail(email)

  if (!result.promoted) {
    response.status(404).json({
      error: 'Aucun utilisateur trouvé pour cet email.',
    })
    return
  }

  response.json(result)
}