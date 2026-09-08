import type { Request, Response } from 'express'
import { Router } from 'express'
import { createClassicRule, deleteClassicRule, getTeamRules, listClassicRules, restoreClassicRule, setClassicRuleEnabled, updateClassicRule } from '../services/ruleAdminService.js'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'

const body = (request: Request) => (request.body ?? {}) as Record<string, unknown>

export const ruleAdminRoutes = Router()

// Lecture : la page Règles est une page normale du site, visible par tous les visiteurs.
ruleAdminRoutes.get('/classic', async (_request: Request, response: Response) => response.json(await listClassicRules()))
ruleAdminRoutes.get('/team', (_request: Request, response: Response) => response.json(getTeamRules()))

// Écriture : réservée aux comptes ADMIN, contrôlée côté serveur quelle que soit la page appelante.
ruleAdminRoutes.post('/classic', requireAuth, requireAdmin, async (request: Request, response: Response) => response.status(201).json(await createClassicRule(body(request))))
ruleAdminRoutes.put('/classic/:ruleId', requireAuth, requireAdmin, async (request: Request, response: Response) => response.json(await updateClassicRule(String(request.params.ruleId), body(request))))
ruleAdminRoutes.patch('/classic/:ruleId/enabled', requireAuth, requireAdmin, async (request: Request, response: Response) => response.json(await setClassicRuleEnabled(String(request.params.ruleId), body(request).enabled)))
ruleAdminRoutes.delete('/classic/:ruleId', requireAuth, requireAdmin, async (request: Request, response: Response) => response.json(await deleteClassicRule(String(request.params.ruleId))))
ruleAdminRoutes.post('/classic/:ruleId/restore', requireAuth, requireAdmin, async (request: Request, response: Response) => response.json(await restoreClassicRule(String(request.params.ruleId))))
