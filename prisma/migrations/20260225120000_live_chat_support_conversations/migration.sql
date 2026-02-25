-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('active', 'waiting_support', 'waiting_user', 'closed');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- DropForeignKey (SupportMessage.ticket_id is becoming optional)
ALTER TABLE "SupportMessage" DROP CONSTRAINT "SupportMessage_ticket_id_fkey";

-- AlterTable
ALTER TABLE "SupportMessage" ADD COLUMN     "conversation_id" TEXT,
ALTER COLUMN "ticket_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "conversation_id" TEXT;

-- CreateTable
CREATE TABLE "SupportConversation" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT,
    "phone_number" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'active',
    "assigned_to" TEXT,
    "assigned_at" TIMESTAMP(3),
    "device_metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "satisfaction_rating" INTEGER,
    "feedback" TEXT,
    "last_message_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationHandover" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "from_admin_id" TEXT NOT NULL,
    "to_admin_id" TEXT NOT NULL,
    "reason" TEXT,
    "status" "HandoverStatus" NOT NULL DEFAULT 'pending',
    "responded_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationHandover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportConversation_user_id_idx" ON "SupportConversation"("user_id");

-- CreateIndex
CREATE INDEX "SupportConversation_email_idx" ON "SupportConversation"("email");

-- CreateIndex
CREATE INDEX "SupportConversation_status_idx" ON "SupportConversation"("status");

-- CreateIndex
CREATE INDEX "SupportConversation_assigned_to_idx" ON "SupportConversation"("assigned_to");

-- CreateIndex
CREATE INDEX "SupportConversation_createdAt_idx" ON "SupportConversation"("createdAt");

-- CreateIndex
CREATE INDEX "SupportConversation_last_message_at_idx" ON "SupportConversation"("last_message_at");

-- CreateIndex
CREATE INDEX "ConversationHandover_conversation_id_idx" ON "ConversationHandover"("conversation_id");

-- CreateIndex
CREATE INDEX "ConversationHandover_from_admin_id_idx" ON "ConversationHandover"("from_admin_id");

-- CreateIndex
CREATE INDEX "ConversationHandover_to_admin_id_idx" ON "ConversationHandover"("to_admin_id");

-- CreateIndex
CREATE INDEX "ConversationHandover_status_idx" ON "ConversationHandover"("status");

-- CreateIndex
CREATE INDEX "SupportMessage_conversation_id_idx" ON "SupportMessage"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_conversation_id_key" ON "SupportTicket"("conversation_id");

-- AddForeignKey
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationHandover" ADD CONSTRAINT "ConversationHandover_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "SupportConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (re-add as optional)
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
