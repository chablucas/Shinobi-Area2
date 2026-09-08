import { Router } from 'express'
import { adminBulkTeamScores, adminCard, adminRarity, adminStat, adminStatKeys, adminStats, adminTeamScore, adminTeamScores, removeTeamScore, resetRarity, resetStat, resetStats } from '../controllers/cardAdminController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
export const cardAdminRoutes = Router()

// Lecture : la page Cartes est une page normale du site, visible par tous les visiteurs.
cardAdminRoutes.get('/stat-keys', adminStatKeys)
cardAdminRoutes.get('/team-scores', adminTeamScores)
cardAdminRoutes.get('/:slug', adminCard)

// Écriture : réservée aux comptes ADMIN, contrôlée côté serveur quelle que soit la page appelante.
cardAdminRoutes.put('/team-scores', requireAuth, requireAdmin, adminBulkTeamScores)
cardAdminRoutes.put('/team-scores/:slug', requireAuth, requireAdmin, adminTeamScore)
cardAdminRoutes.delete('/team-scores/:slug', requireAuth, requireAdmin, removeTeamScore)
cardAdminRoutes.put('/:slug/stats', requireAuth, requireAdmin, adminStats)
cardAdminRoutes.delete('/:slug/stats', requireAuth, requireAdmin, resetStats)
cardAdminRoutes.put('/:slug/stats/:statKey', requireAuth, requireAdmin, adminStat)
cardAdminRoutes.delete('/:slug/stats/:statKey', requireAuth, requireAdmin, resetStat)
cardAdminRoutes.put('/:slug/rarity', requireAuth, requireAdmin, adminRarity)
cardAdminRoutes.delete('/:slug/rarity', requireAuth, requireAdmin, resetRarity)