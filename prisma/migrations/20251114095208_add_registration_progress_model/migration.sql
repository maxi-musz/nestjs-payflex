-- CreateTable
CREATE TABLE "RegistrationProgress" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "total_steps" INTEGER NOT NULL DEFAULT 9,
    "step_1_completed" BOOLEAN NOT NULL DEFAULT false,
    "step_2_completed" BOOLEAN NOT NULL DEFAULT false,
    "step_3_completed" BOOLEAN NOT NULL DEFAULT false,
    "step_3_verified" BOOLEAN NOT NULL DEFAULT false,
    "step_4_completed" BOOLEAN NOT NULL DEFAULT false,
    "step_5_completed" BOOLEAN NOT NULL DEFAULT false,
    "step_6_completed" BOOLEAN NOT NULL DEFAULT false,
    "step_7_completed" BOOLEAN NOT NULL DEFAULT false,
    "step_8_completed" BOOLEAN NOT NULL DEFAULT false,
    "step_9_completed" BOOLEAN NOT NULL DEFAULT false,
    "registration_data" JSONB NOT NULL DEFAULT '{}',
    "referral_code" TEXT,
    "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "id_verification_status" TEXT,
    "face_verification_status" TEXT,
    "otp" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "verification_attempts" INTEGER NOT NULL DEFAULT 0,
    "device_metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationProgress_phone_number_key" ON "RegistrationProgress"("phone_number");

-- CreateIndex
CREATE INDEX "RegistrationProgress_phone_number_idx" ON "RegistrationProgress"("phone_number");

-- CreateIndex
CREATE INDEX "RegistrationProgress_is_complete_idx" ON "RegistrationProgress"("is_complete");

-- CreateIndex
CREATE INDEX "RegistrationProgress_is_phone_verified_idx" ON "RegistrationProgress"("is_phone_verified");
