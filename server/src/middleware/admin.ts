import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../config/prisma.js'
import type { AuthenticatedRequest } from './auth.js'

export async function requireAdmin(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const user = await prisma.user.findUnique({
    where: {
      id: (request as AuthenticatedRequest).userId,
    },
    select: {
      role: true,
    },
  })

  if (
    user?.role !== 'ADMIN' &&
    user?.role !== 'SUPER_ADMIN'
  ) {
    response.status(403).json({
      error: 'Droits administrateur requis.',
    })
    return
  }

  next()
}

export async function requireSuperAdmin(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const user = await prisma.user.findUnique({
    where: {
      id: (request as AuthenticatedRequest).userId,
    },
    select: {
      role: true,
      email: true,
    },
  })

  const superAdminEmail =
    process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()

  if (
    !user ||
    user.role !== 'SUPER_ADMIN' ||
    !superAdminEmail ||
    user.email.trim().toLowerCase() !== superAdminEmail
  ) {
    response.status(403).json({
      error: 'Droits super administrateur requis.',
    })
    return
  }

  next()
}