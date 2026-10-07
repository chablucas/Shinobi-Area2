
import webpush from 'web-push'
import { prisma } from '../config/prisma.js'

const publicKey = process.env.VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
const subject = process.env.VAPID_SUBJECT

if (publicKey && privateKey && subject) {
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export function getVapidPublicKey() {
  if (!publicKey || !privateKey || !subject) {
    throw new Error('Notifications push non configurées.')
  }
  return publicKey
}

export async function sendPushToUser(
  userId: number,
  payload: {
    title: string
    body: string
    url?: string
  }
) {
  getVapidPublicKey()

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  })

  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload),
          { TTL: 3600 }
        )
      } catch (error) {
        const statusCode =
          typeof error === 'object' && error !== null && 'statusCode' in error
            ? error.statusCode
            : undefined

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({
            where: { id: subscription.id },
          })
          return
        }

        throw error
      }
    })
  )

  return {
    total: subscriptions.length,
    sent: results.filter(
      (result) => result.status === 'fulfilled'
    ).length,
    failed: results.filter(
      (result) => result.status === 'rejected'
    ).length,
  }
}
