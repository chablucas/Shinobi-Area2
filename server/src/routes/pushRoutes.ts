
import { Router } from 'express'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import {
  requireAuth,
  requireApprovedUser,
} from '../middleware/auth.js'
import { prisma } from '../config/prisma.js'
import {
  getVapidPublicKey,
  sendPushToUser,
} from '../services/pushService.js'

export const pushRoutes = Router()

pushRoutes.use(requireAuth, requireApprovedUser)

pushRoutes.get('/public-key', (_request, response) => {
  try {
    response.json({ publicKey: getVapidPublicKey() })
  } catch {
    response.status(503).json({
      error: 'Notifications indisponibles.',
    })
  }
})

pushRoutes.post('/subscribe', async (request, response) => {
  const userId = (request as AuthenticatedRequest).userId
  const { endpoint, keys } = request.body ?? {}

  if (
    typeof endpoint !== 'string' ||
    !endpoint.startsWith('https://') ||
    endpoint.length > 2048 ||
    typeof keys?.p256dh !== 'string' ||
    typeof keys?.auth !== 'string' ||
    !keys.p256dh ||
    !keys.auth ||
    keys.p256dh.length > 512 ||
    keys.auth.length > 512
  ) {
    response.status(400).json({
      error: 'Abonnement push invalide.',
    })
    return
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    create: {
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  })

  response.status(201).json({ success: true })
})

pushRoutes.post('/unsubscribe', async (request, response) => {
  const userId = (request as AuthenticatedRequest).userId
  const endpoint = request.body?.endpoint

  if (typeof endpoint !== 'string') {
    response.status(400).json({
      error: 'Endpoint invalide.',
    })
    return
  }

  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  })

  response.json({ success: true })
})

const lastTestByUser = new Map<number, number>()

pushRoutes.post('/test', async (request, response) => {
  const userId = (request as AuthenticatedRequest).userId
  const now = Date.now()
  const lastTest = lastTestByUser.get(userId) ?? 0

  if (now - lastTest < 5_000) {
    response.status(429).json({
      error: 'Attends 5 secondes avant un autre test.',
    })
    return
  }

  lastTestByUser.set(userId, now)

  try {
    const result = await sendPushToUser(userId, {
      title: 'Shinobi Area 🍥',
      body: 'Les notifications fonctionnent !',
      url: '/profil',
    })

    response.json(result)
  } catch {
    response.status(503).json({
      error: 'Impossible d’envoyer la notification.',
    })
  }
})
