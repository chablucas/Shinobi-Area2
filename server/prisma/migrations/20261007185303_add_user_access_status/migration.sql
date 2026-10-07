-- CreateEnum
CREATE TYPE "UserAccessStatus" AS ENUM ('PENDING', 'APPROVED', 'BLOCKED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "accessStatus" "UserAccessStatus" NOT NULL DEFAULT 'PENDING';

-- Tous les comptes déjà existants sont automatiquement autorisés
UPDATE "User"
SET "accessStatus" = 'APPROVED';