-- CreateEnum
CREATE TYPE "SupportType" AS ENUM ('REGISTRATION_ISSUE', 'LOGIN_ISSUE', 'TRANSACTION_ISSUE', 'PAYMENT_ISSUE', 'ACCOUNT_ISSUE', 'WALLET_ISSUE', 'CARD_ISSUE', 'KYC_VERIFICATION_ISSUE', 'SECURITY_ISSUE', 'FEATURE_REQUEST', 'BUG_REPORT', 'BILLING_ISSUE', 'REFUND_REQUEST', 'GENERAL_INQUIRY', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('pending', 'in_progress', 'waiting_user', 'resolved', 'closed', 'escalated');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "user_id" TEXT,
    "phone_number" TEXT,
    "email" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "support_type" "SupportType" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'pending',
    "priority" "TicketPriority" NOT NULL DEFAULT 'medium',
    "assigned_to" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "resolution_notes" TEXT,
    "related_transaction_id" TEXT,
    "related_registration_progress_id" TEXT,
    "device_metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "tags" JSONB,
    "internal_notes" TEXT,
    "attachments" JSONB,
    "first_response_at" TIMESTAMP(3),
    "last_response_at" TIMESTAMP(3),
    "response_time_seconds" INTEGER,
    "satisfaction_rating" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "is_from_user" BOOLEAN NOT NULL DEFAULT true,
    "user_id" TEXT,
    "sender_name" TEXT,
    "sender_email" TEXT,
    "attachments" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_ticket_number_key" ON "SupportTicket"("ticket_number");

-- CreateIndex
CREATE INDEX "SupportTicket_ticket_number_idx" ON "SupportTicket"("ticket_number");

-- CreateIndex
CREATE INDEX "SupportTicket_user_id_idx" ON "SupportTicket"("user_id");

-- CreateIndex
CREATE INDEX "SupportTicket_phone_number_idx" ON "SupportTicket"("phone_number");

-- CreateIndex
CREATE INDEX "SupportTicket_email_idx" ON "SupportTicket"("email");

-- CreateIndex
CREATE INDEX "SupportTicket_support_type_idx" ON "SupportTicket"("support_type");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");

-- CreateIndex
CREATE INDEX "SupportTicket_assigned_to_idx" ON "SupportTicket"("assigned_to");

-- CreateIndex
CREATE INDEX "SupportTicket_related_transaction_id_idx" ON "SupportTicket"("related_transaction_id");

-- CreateIndex
CREATE INDEX "SupportTicket_related_registration_progress_id_idx" ON "SupportTicket"("related_registration_progress_id");

-- CreateIndex
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_resolved_at_idx" ON "SupportTicket"("resolved_at");

-- CreateIndex
CREATE INDEX "SupportMessage_ticket_id_idx" ON "SupportMessage"("ticket_id");

-- CreateIndex
CREATE INDEX "SupportMessage_user_id_idx" ON "SupportMessage"("user_id");

-- CreateIndex
CREATE INDEX "SupportMessage_is_internal_idx" ON "SupportMessage"("is_internal");

-- CreateIndex
CREATE INDEX "SupportMessage_is_from_user_idx" ON "SupportMessage"("is_from_user");

-- CreateIndex
CREATE INDEX "SupportMessage_createdAt_idx" ON "SupportMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
