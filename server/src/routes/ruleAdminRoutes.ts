import type { Request, Response } from 'express'
import { Router } from 'express'
import { createClassicRule, deleteClassicRule, getTeamRules, listClassicRules, restoreClassicRule, setClassicRuleEnabled, updateClassicRule } from '../services/ruleAdminService.js'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'

const body = (request: Request) => (request.body ?? {}) as Record<string, unknown>

export const ruleAdminRoutes = Router()
ruleAdminRoutes.use(requireAuth, requireAdmin)
ruleAdminRoutes.get('/classic', async (_request: Request, response: Response) => response.json(await listClassicRules()))
ruleAdminRoutes.post('/classic', async (request: Request, response: Response) => response.status(201).json(await createClassicRule(body(request))))
ruleAdminRoutes.put('/classic/:ruleId', async (request: Request, response: Response) => response.json(await updateClassicRule(String(request.params.ruleId), body(request))))
ruleAdminRoutes.patch('/classic/:ruleId/enabled', async (request: Request, response: Response) => response.json(await setClassicRuleEnabled(String(request.params.ruleId), body(request).enabled)))
ruleAdminRoutes.delete('/classic/:ruleId', async (request: Request, response: Response) => response.json(await deleteClassicRule(String(request.params.ruleId))))
ruleAdminRoutes.post('/classic/:ruleId/restore', async (request: Request, response: Response) => response.json(await restoreClassicRule(String(request.params.ruleId))))
ruleAdminRoutes.get('/team', (_request: Request, response: Response) => response.json(getTeamRules()))
