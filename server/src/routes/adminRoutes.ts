import { Router } from 'express'
import {
  approveAdminUserController,
  deletePendingAdminUserController,
  getAdminOverviewController,
  getAdminUsersController,
  patchAdminUserBlockedController,
  patchAdminUserRoleController,
  promoteAdminController,
} from '../controllers/adminController.js'
import { requireSuperAdmin } from '../middleware/admin.js'
import { requireApprovedUser, requireAuth } from '../middleware/auth.js'

export const adminRoutes = Router()

// Toute la gestion des utilisateurs est réservée au SUPER_ADMIN approuvé.
adminRoutes.use(
  requireAuth,
  requireApprovedUser,
  requireSuperAdmin
)

adminRoutes.get('/overview', getAdminOverviewController)
adminRoutes.get('/users', getAdminUsersController)

// Accepter une demande d'accès
adminRoutes.patch(
  '/users/:id/approve',
  approveAdminUserController
)

// Supprimer une demande en attente
adminRoutes.delete(
  '/users/:id/pending',
  deletePendingAdminUserController
)

// Gestion des rôles
adminRoutes.patch(
  '/users/:id/role',
  patchAdminUserRoleController
)

// Bloquer / débloquer un utilisateur
adminRoutes.patch(
  '/users/:id/blocked',
  patchAdminUserBlockedController
)

// Promotion USER -> ADMIN
adminRoutes.post(
  '/promote',
  promoteAdminController
)