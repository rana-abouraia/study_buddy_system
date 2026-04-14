ALTER TABLE "Notification"
ADD COLUMN "title" TEXT NOT NULL DEFAULT 'Notification',
ADD COLUMN "sourceTopic" TEXT NOT NULL DEFAULT 'unknown-topic',
ADD COLUMN "producerService" TEXT,
ADD COLUMN "correlationId" TEXT,
ADD COLUMN "readAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX "Notification_sourceTopic_idx" ON "Notification"("sourceTopic");
