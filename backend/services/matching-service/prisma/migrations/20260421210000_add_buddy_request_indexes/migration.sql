-- Self-healing migration for BuddyRequest.
-- Some environments applied the init migration at a point when it did not
-- yet include the BuddyRequest CREATE TABLE. This migration creates the
-- table if missing, then (re)creates its indexes. All statements are idempotent.

CREATE TABLE IF NOT EXISTS "BuddyRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BuddyRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BuddyRequest_senderId_receiverId_key" ON "BuddyRequest"("senderId", "receiverId");
CREATE INDEX IF NOT EXISTS "BuddyRequest_receiverId_status_idx" ON "BuddyRequest"("receiverId", "status");
CREATE INDEX IF NOT EXISTS "BuddyRequest_senderId_status_idx" ON "BuddyRequest"("senderId", "status");
