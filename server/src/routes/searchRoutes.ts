import { Router } from 'express'
import { search } from '../controllers/searchController.js'
import {
  requireApprovedUser,
  requireAuth,
} from '../middleware/auth.js'

export const searchRoutes = Router()

searchRoutes.get(
  '/',
  requireAuth,
  requireApprovedUser,
  search
)