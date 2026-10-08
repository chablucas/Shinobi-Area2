import { prisma } from '../config/prisma.js'
import { deleteUserAvatar } from './avatarService.js'

export async function retryPendingAvatarDeletions() {
  const pending = await prisma.pendingAvatarDeletion.findMany({
    take: 50,
    orderBy: {
      createdAt: 'asc',
    },
  })

  for (const item of pending) {
    try {
      await deleteUserAvatar(item.publicId)

      await prisma.pendingAvatarDeletion.delete({
        where: {
          id: item.id,
        },
      })

      console.log(
        `Avatar Cloudinary nettoyé : ${item.publicId}`
      )
    } catch (error) {
      console.error(
        `Échec du nettoyage de l'avatar ${item.publicId} :`,
        error
      )
    }
  }
}