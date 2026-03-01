-- CreateEnum
CREATE TYPE "NotificationTargetType" AS ENUM ('all', 'individual', 'filtered');

-- CreateEnum
CREATE TYPE "NotificationCampaignStatus" AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFICATION_CAMPAIGN_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFICATION_CAMPAIGN_SEND';
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFICATION_CAMPAIGN_CANCEL';

-- AlterEnum
ALTER TYPE "PermissionResource" ADD VALUE 'NOTIFICATIONS';

-- CreateTable
CREATE TABLE "notification_campaigns" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content_markdown" TEXT NOT NULL,
    "content_html" TEXT NOT NULL,
    "target_type" "NotificationTargetType" NOT NULL,
    "target_filters" JSONB,
    "target_emails" JSONB,
    "status" "NotificationCampaignStatus" NOT NULL DEFAULT 'draft',
    "scheduled_for" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_campaigns_status_idx" ON "notification_campaigns"("status");

-- CreateIndex
CREATE INDEX "notification_campaigns_scheduled_for_idx" ON "notification_campaigns"("scheduled_for");

-- CreateIndex
CREATE INDEX "notification_logs_campaign_id_idx" ON "notification_logs"("campaign_id");

-- CreateIndex
CREATE INDEX "notification_logs_email_idx" ON "notification_logs"("email");

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "notification_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
