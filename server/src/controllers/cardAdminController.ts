import type { Request, Response } from 'express'
import { CREATOR_STAT_KEYS, deleteRarity, deleteStat, getEffectiveCard, listTeamScores, resetCardStats, resetTeamScore, updateRarity, updateStat, updateStats, updateTeamScore, updateTeamScores } from '../services/cardAdminService.js'
const slug = (request: Request) => String(request.params.slug)
const body = (request: Request) => request.body as Record<string, unknown>
export async function adminCard(request: Request, response: Response) { response.json(await getEffectiveCard(slug(request))) }
export async function adminStatKeys(_request: Request, response: Response) { response.json(CREATOR_STAT_KEYS) }
export async function adminStat(request: Request, response: Response) { response.json(await updateStat(slug(request), String(request.params.statKey), body(request).value)) }
export async function adminStats(request: Request, response: Response) { response.json(await updateStats(slug(request), body(request).stats)) }
export async function resetStat(request: Request, response: Response) { await deleteStat(slug(request), String(request.params.statKey)); response.status(204).send() }
export async function resetStats(request: Request, response: Response) { response.json(await resetCardStats(slug(request))) }
export async function adminRarity(request: Request, response: Response) { response.json(await updateRarity(slug(request), body(request).rarity)) }
export async function resetRarity(request: Request, response: Response) { await deleteRarity(slug(request)); response.status(204).send() }
export async function adminTeamScores(_request: Request, response: Response) { response.json(listTeamScores()) }
export async function adminTeamScore(request: Request, response: Response) { response.json(await updateTeamScore(slug(request), body(request).score)) }
export async function adminBulkTeamScores(request: Request, response: Response) { response.json(await updateTeamScores(body(request).scores)) }
export async function removeTeamScore(request: Request, response: Response) { response.json(await resetTeamScore(slug(request))) }