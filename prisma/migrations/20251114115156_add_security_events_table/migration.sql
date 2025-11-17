-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "phone_number" TEXT,
    "user_id" TEXT,
    "registration_progress_id" TEXT,
    "device_id" TEXT,
    "device_fingerprint" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "resolution_notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityEvent_event_type_idx" ON "SecurityEvent"("event_type");

-- CreateIndex
CREATE INDEX "SecurityEvent_event_category_idx" ON "SecurityEvent"("event_category");

-- CreateIndex
CREATE INDEX "SecurityEvent_severity_idx" ON "SecurityEvent"("severity");

-- CreateIndex
CREATE INDEX "SecurityEvent_phone_number_idx" ON "SecurityEvent"("phone_number");

-- CreateIndex
CREATE INDEX "SecurityEvent_user_id_idx" ON "SecurityEvent"("user_id");

-- CreateIndex
CREATE INDEX "SecurityEvent_registration_progress_id_idx" ON "SecurityEvent"("registration_progress_id");

-- CreateIndex
CREATE INDEX "SecurityEvent_device_id_idx" ON "SecurityEvent"("device_id");

-- CreateIndex
CREATE INDEX "SecurityEvent_ip_address_idx" ON "SecurityEvent"("ip_address");

-- CreateIndex
CREATE INDEX "SecurityEvent_is_resolved_idx" ON "SecurityEvent"("is_resolved");

-- CreateIndex
CREATE INDEX "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");
