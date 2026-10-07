import type { Request, Response } from 'express'
import { Router } from 'express'
import {
  createClassicRule,
  deleteClassicRule,
  getTeamRules,
  listClassicRules,
  restoreClassicRule,
  setClassicRuleEnabled,
  updateClassicRule,
} from '../services/ruleAdminService.js'
import { requireApprovedUser, requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'

const body = (request: Request) =>
  (request.body ?? {}) as Record<string, unknown>

export const ruleAdminRoutes = Router()

// Lecture : récupération des règles.
ruleAdminRoutes.get(
  '/classic',
  async (_request: Request, response: Response) =>
    response.json(await listClassicRules())
)

ruleAdminRoutes.get(
  '/team',
  (_request: Request, response: Response) =>
    response.json(getTeamRules())
)

// Écriture : réservée aux comptes ADMIN / SUPER_ADMIN approuvés.
ruleAdminRoutes.post(
  '/classic',
  requireAuth,
  requireApprovedUser,
  requireAdmin,
  async (request: Request, response: Response) =>
    response.status(201).json(
      await createClassicRule(body(request))
    )
)

ruleAdminRoutes.put(
  '/classic/:ruleId',
  requireAuth,
  requireApprovedUser,
  requireAdmin,
  async (request: Request, response: Response) =>
    response.json(
      await updateClassicRule(
        String(request.params.ruleId),
        body(request)
      )
    )
)

ruleAdminRoutes.patch(
  '/classic/:ruleId/enabled',
  requireAuth,
  requireApprovedUser,
  requireAdmin,
  async (request: Request, response: Response) =>
    response.json(
      await setClassicRuleEnabled(
        String(request.params.ruleId),
        body(request).enabled
      )
    )
)

ruleAdminRoutes.delete(
  '/classic/:ruleId',
  requireAuth,
  requireApprovedUser,
  requireAdmin,
  async (request: Request, response: Response) =>
    response.json(
      await deleteClassicRule(
        String(request.params.ruleId)
      )
    )
)

ruleAdminRoutes.post(
  '/classic/:ruleId/restore',
  requireAuth,
  requireApprovedUser,
  requireAdmin,
  async (request: Request, response: Response) =>
    response.json(
      await restoreClassicRule(
        String(request.params.ruleId)
      )
    )
)