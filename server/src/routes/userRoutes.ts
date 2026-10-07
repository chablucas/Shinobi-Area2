import { Router } from 'express'
import multer from 'multer'

import {
  getPublicProfile,
  recordGameResult,
  updateProfile,
  updateAvatar,
} from '../controllers/userController.js'

import {
  requireApprovedUser,
  requireAuth,
} from '../middleware/auth.js'

export const userRoutes = Router()

const avatarUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Mo maximum
  },

  fileFilter: (_request, file, callback) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.mimetype)) {
      callback(
        new Error(
          'Format non autorisé. Utilisez JPG, PNG ou WEBP.'
        )
      )
      return
    }

    callback(null, true)
  },
})

// Toutes les routes utilisateur nécessitent
// un compte connecté ET approuvé.
userRoutes.use(requireAuth, requireApprovedUser)

userRoutes.patch(
  '/me',
  updateProfile
)

userRoutes.post(
  '/me/avatar',
  avatarUpload.single('avatar'),
  updateAvatar
)

userRoutes.post(
  '/me/results',
  recordGameResult
)

userRoutes.get(
  '/:userId',
  getPublicProfile
)