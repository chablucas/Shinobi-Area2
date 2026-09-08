import { Router } from 'express'
import { getAdminOverviewController, getAdminUsersController, patchAdminUserBlockedController, patchAdminUserRoleController, promoteAdminController } from '../controllers/adminController.js'
import { requireAdmin } from '../middleware/admin.js'
import { requireAuth } from '../middleware/auth.js'

export const adminRoutes = Router()
adminRoutes.use(requireAuth, requireAdmin)
adminRoutes.get('/overview', getAdminOverviewController)
adminRoutes.get('/users', getAdminUsersController)
adminRoutes.patch('/users/:id/role', patchAdminUserRoleController)
adminRoutes.patch('/users/:id/blocked', patchAdminUserBlockedController)
adminRoutes.post('/promote', promoteAdminController)
