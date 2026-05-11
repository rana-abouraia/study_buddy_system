-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "userA" TEXT NOT NULL,
    "userB" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'BUDDY_REQUEST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Connection_userA_userB_key" ON "Connection"("userA", "userB");
CREATE INDEX "Connection_userA_idx" ON "Connection"("userA");
CREATE INDEX "Connection_userB_idx" ON "Connection"("userB");
