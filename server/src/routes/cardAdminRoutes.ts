import { Router } from 'express'
import {
  adminBulkTeamScores,
  adminCard,
  adminRarity,
  adminStat,
  adminStatKeys,
  adminStats,
  adminTeamScore,
  adminTeamScores,
  removeTeamScore,
  resetRarity,
  resetStat,
  resetStats,
} from '../controllers/cardAdminController.js'
import { requireApprovedUser, requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'

export const cardAdminRoutes = Router()

// Lecture : utilisée pour récupérer les données des cartes.
cardAdminRoutes.get('/stat-keys', adminStatKeys)
cardAdminRoutes.get('/team-scores', adminTeamScores)
cardAdminRoutes.get('/:slug', adminCard)

// Écriture : réservée aux comptes ADMIN / SUPER_ADMIN approuvés.
cardAdminRoutes.put(
  '/team-scores',
  requireAuth,
  requireApprovedUser,
  requireAdmin,
  adminBulkTeamScores
)

cardAdminRoutes.put(
  '/team-scores/:slug',
  requireAuth,
  requireApprovedUser,
  requireAdmin,
  adminTeamScore
)

cardAdminRoutes.delete(
  '/team-scores/:slug',
  requireAuth,
  requireApprovedUser,
  requireAdmin,
  removeTeamScore
)

cardAdminRoutes.put(
  '/:slug/stats',
  requireAuth,
  requireApprovedUser,
  requireAdmin,
  adminStats
)

cardAdminRoutes.delete(
  '/:slug/stats',
  requireAuth,
  requireApprovedUser,
  requireAdmin,
  resetStats
)

cardAdminRoutes.put(
  '/:slug/stats/:statKey',
  requireAuth,
  requireApprovedUser,
  requireAdmin,
  adminStat
)

cardAdminRoutes.delete(
  '/:slug/stats/:statKey',
  requireAuth,
  requireApprovedUser,
  requireAdmin,
  resetStat
)

cardAdminRoutes.put(
  '/:slug/rarity',
  requireAuth,
  requireApprovedUser,
  requireAdmin,
  adminRarity
)

cardAdminRoutes.delete(
  '/:slug/rarity',
  requireAuth,
  requireApprovedUser,
  requireAdmin,
  resetRarity
)