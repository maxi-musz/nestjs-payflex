-- CreateEnum
CREATE TYPE "PushBroadcastStatus" AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PUSH_BROADCAST_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'PUSH_BROADCAST_SEND';
ALTER TYPE "AuditAction" ADD VALUE 'PUSH_BROADCAST_CANCEL';

-- CreateTable
CREATE TABLE "push_broadcasts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "message" TEXT,
    "target_type" "NotificationTargetType" NOT NULL,
    "target_filters" JSONB,
    "target_user_ids" JSONB,
    "data" JSONB,
    "status" "PushBroadcastStatus" NOT NULL DEFAULT 'draft',
    "scheduled_for" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_broadcast_logs" (
    "id" TEXT NOT NULL,
    "broadcast_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_broadcast_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_broadcast_inbox" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "broadcast_id" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "message" TEXT,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_broadcast_inbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "push_broadcasts_status_idx" ON "push_broadcasts"("status");
CREATE INDEX "push_broadcasts_scheduled_for_idx" ON "push_broadcasts"("scheduled_for");
CREATE INDEX "push_broadcast_logs_broadcast_id_idx" ON "push_broadcast_logs"("broadcast_id");
CREATE INDEX "push_broadcast_logs_user_id_idx" ON "push_broadcast_logs"("user_id");
CREATE INDEX "push_broadcast_inbox_user_id_createdAt_idx" ON "push_broadcast_inbox"("user_id", "createdAt");
CREATE INDEX "push_broadcast_inbox_user_id_is_read_idx" ON "push_broadcast_inbox"("user_id", "is_read");

-- AddForeignKey
ALTER TABLE "push_broadcast_logs" ADD CONSTRAINT "push_broadcast_logs_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "push_broadcasts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
