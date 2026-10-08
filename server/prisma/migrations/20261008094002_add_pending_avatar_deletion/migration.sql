-- CreateTable
CREATE TABLE "PendingAvatarDeletion" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingAvatarDeletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingAvatarDeletion_publicId_key" ON "PendingAvatarDeletion"("publicId");
