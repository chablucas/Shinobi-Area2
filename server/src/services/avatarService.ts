import { v2 as cloudinary } from 'cloudinary'
import { prisma } from '../config/prisma.js'
import { requireCloudinaryConfig } from '../config/env.js'

const { cloudName, apiKey, apiSecret } = requireCloudinaryConfig()

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
})

export async function updateUserAvatar(
  userId: number,
  imageBuffer: Buffer
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      avatarCloudinaryPublicId: true,
    },
  })

  if (!user) {
    throw new Error('Utilisateur introuvable.')
  }

  const uploadResult = await new Promise<{
    secure_url: string
    public_id: string
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'shinobi-area/avatars',

        transformation: [
          {
            width: 500,
            height: 500,
            crop: 'fill',
            gravity: 'face',
          },
          {
            quality: 'auto',
            fetch_format: 'auto',
          },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Upload Cloudinary impossible.'))
          return
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        })
      }
    )

    stream.end(imageBuffer)
  })

  /*
   * On sauvegarde d'abord la nouvelle image.
   */
  const updatedUser = await prisma.user.update({
    where: { id: userId },

    data: {
      avatarUrl: uploadResult.secure_url,
      avatarCloudinaryPublicId: uploadResult.public_id,
    },
  })

  if (user.avatarCloudinaryPublicId) {
  const oldAvatarPublicId = user.avatarCloudinaryPublicId

  try {
    await deleteUserAvatar(oldAvatarPublicId)
  } catch (error) {
    console.error(
      "Suppression de l'ancien avatar à réessayer :",
      error
    )

    await prisma.pendingAvatarDeletion.upsert({
      where: {
        publicId: oldAvatarPublicId,
      },
      create: {
        publicId: oldAvatarPublicId,
      },
      update: {},
    })
  }
}


  return updatedUser
}

export async function deleteUserAvatar(
  publicId: string
): Promise<void> {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
    invalidate: true,
  })

  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new Error(
      `Suppression Cloudinary impossible : ${result.result}`
    )
  }
}