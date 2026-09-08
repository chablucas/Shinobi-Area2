import { teamAuctionRules } from './teamAuctionRules.js'

// Paramètres de partie Team Auction appliqués par le serveur temps réel.
export const TEAM_AUCTION_SETTINGS = {
  defaultTeamSizes: [3, 3],
  defaultInitialBudget: 500,
  minBid: teamAuctionRules.minBid,
  bidUnit: teamAuctionRules.bidUnit,
  openingBid: teamAuctionRules.openingBid,
  allowAllIn: teamAuctionRules.allowAllIn,
  allowPass: teamAuctionRules.allowPass,
  passIsFinalForCurrentCard: teamAuctionRules.passIsFinalForCurrentCard,
} as const
