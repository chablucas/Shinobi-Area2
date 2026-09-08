import { Router } from 'express'
import { adminBulkTeamScores, adminCard, adminRarity, adminStat, adminStatKeys, adminStats, adminTeamScore, adminTeamScores, removeTeamScore, resetRarity, resetStat, resetStats } from '../controllers/cardAdminController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
export const cardAdminRoutes = Router()
cardAdminRoutes.use(requireAuth, requireAdmin)
cardAdminRoutes.get('/stat-keys', adminStatKeys)
cardAdminRoutes.get('/team-scores', adminTeamScores)
cardAdminRoutes.put('/team-scores', adminBulkTeamScores)
cardAdminRoutes.put('/team-scores/:slug', adminTeamScore)
cardAdminRoutes.delete('/team-scores/:slug', removeTeamScore)
cardAdminRoutes.get('/:slug', adminCard)
cardAdminRoutes.put('/:slug/stats', adminStats)
cardAdminRoutes.delete('/:slug/stats', resetStats)
cardAdminRoutes.put('/:slug/stats/:statKey', adminStat)
cardAdminRoutes.delete('/:slug/stats/:statKey', resetStat)
cardAdminRoutes.put('/:slug/rarity', adminRarity)
cardAdminRoutes.delete('/:slug/rarity', resetRarity)