import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { requireJwtSecret } from '../config/env.js'
import { prisma } from '../config/prisma.js'

export type AuthenticatedRequest = Request & { userId: number }

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const header = request.header('authorization')
  const token = header?.startsWith('Bearer ')
    ? header.slice(7)
    : null

  if (!token) {
    response.status(401).json({
      error: 'Authentification requise',
    })
    return
  }

  try {
    const payload = jwt.verify(token, requireJwtSecret())

    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string'
    ) {
      throw new Error('Token invalide')
    }

    ;(request as AuthenticatedRequest).userId = Number(payload.sub)

    if (
      !Number.isInteger(
        (request as AuthenticatedRequest).userId
      )
    ) {
      throw new Error('Token invalide')
    }
  } catch {
    response.status(401).json({
      error: 'Token invalide ou expiré',
    })
    return
  }

  const user = await prisma.user.findUnique({
    where: {
      id: (request as AuthenticatedRequest).userId,
    },
    select: {
      id: true,
    },
  })

  if (!user) {
    response.status(401).json({
      error: 'Token invalide ou expiré',
    })
    return
  }

  next()
}

export async function requireApprovedUser(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const userId = (request as AuthenticatedRequest).userId

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      accessStatus: true,
    },
  })

  if (!user) {
    response.status(401).json({
      error: 'Utilisateur introuvable.',
    })
    return
  }

  if (user.accessStatus === 'PENDING') {
    response.status(403).json({
      code: 'ACCESS_PENDING',
      error: 'Votre demande d’accès est en attente de validation.',
    })
    return
  }

  if (user.accessStatus === 'BLOCKED') {
    response.status(403).json({
      code: 'ACCESS_BLOCKED',
      error: 'Votre accès à Shinobi Area a été désactivé.',
    })
    return
  }

  next()
}