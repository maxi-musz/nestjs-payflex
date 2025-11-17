-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referee_phone_number" TEXT NOT NULL,
    "referee_user_id" TEXT,
    "referral_code_used" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "reward_given" BOOLEAN NOT NULL DEFAULT false,
    "reward_amount" DECIMAL(10,2),
    "reward_given_at" TIMESTAMP(3),
    "registration_progress_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Referral_referrer_id_idx" ON "Referral"("referrer_id");

-- CreateIndex
CREATE INDEX "Referral_referee_user_id_idx" ON "Referral"("referee_user_id");

-- CreateIndex
CREATE INDEX "Referral_referee_phone_number_idx" ON "Referral"("referee_phone_number");

-- CreateIndex
CREATE INDEX "Referral_is_active_idx" ON "Referral"("is_active");

-- CreateIndex
CREATE INDEX "Referral_reward_given_idx" ON "Referral"("reward_given");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referee_phone_number_referrer_id_key" ON "Referral"("referee_phone_number", "referrer_id");

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referee_user_id_fkey" FOREIGN KEY ("referee_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
