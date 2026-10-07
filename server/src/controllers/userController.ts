import type { Request, Response } from 'express'
import { getPublicUser } from '../services/friendshipService.js'
import { recordResult, updateDisplayName } from '../services/authService.js'
import { updateUserAvatar } from '../services/avatarService.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'

export async function updateProfile(request: Request, response: Response) {
  const { displayName } = request.body ?? {}
  if (typeof displayName !== 'string' || !displayName.trim()) {
    response.status(400).json({ error: 'Le nom est requis.' })
    return
  }
  response.json(await updateDisplayName((request as AuthenticatedRequest).userId, displayName))
}

export async function recordGameResult(request: Request, response: Response) {
  const { gameId, won } = request.body ?? {}
  if (typeof gameId !== 'string' || !gameId.trim() || typeof won !== 'boolean') {
    response.status(400).json({ error: 'Identifiant de partie et résultat requis.' })
    return
  }
  response.json(await recordResult((request as AuthenticatedRequest).userId, gameId, won))
}

export async function getPublicProfile(request: Request, response: Response) {
  const id = Number(request.params.userId)
  if (!Number.isInteger(id) || id <= 0) { response.status(400).json({ error: 'Utilisateur invalide.' }); return }
  response.json(await getPublicUser((request as AuthenticatedRequest).userId, id))
}

export async function updateAvatar(
  request: Request,
  response: Response
) {
  try {
    const file = request.file

    if (!file) {
      response.status(400).json({
        error: 'Aucune image envoyée.',
      })
      return
    }

    const userId = (request as AuthenticatedRequest).userId

    const user = await updateUserAvatar(
      userId,
      file.buffer
    )

    response.json(user)
  } catch (error) {
    console.error(
      "Erreur lors de la modification de l'avatar :",
      error
    )

    response.status(500).json({
      error: "Impossible de modifier la photo de profil.",
    })
  }
}