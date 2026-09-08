-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blockedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TeamAuctionScoreOverride" (
    "id" SERIAL NOT NULL,
    "cardSlug" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamAuctionScoreOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombatRuleOverride" (
    "id" SERIAL NOT NULL,
    "ruleId" TEXT NOT NULL,
    "definition" JSONB,
    "enabled" BOOLEAN,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "custom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CombatRuleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamAuctionScoreOverride_cardSlug_key" ON "TeamAuctionScoreOverride"("cardSlug");

-- CreateIndex
CREATE UNIQUE INDEX "CombatRuleOverride_ruleId_key" ON "CombatRuleOverride"("ruleId");
