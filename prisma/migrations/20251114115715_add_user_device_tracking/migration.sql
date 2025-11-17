-- CreateTable
CREATE TABLE "UserDevice" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "device_fingerprint" TEXT,
    "device_name" TEXT,
    "device_model" TEXT,
    "platform" "Platform" NOT NULL,
    "os_name" TEXT,
    "os_version" TEXT,
    "app_version" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_restricted" BOOLEAN NOT NULL DEFAULT false,
    "is_current_device" BOOLEAN NOT NULL DEFAULT false,
    "last_ip_address" TEXT,
    "last_location" TEXT,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restricted_at" TIMESTAMP(3),
    "restricted_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserDevice_user_id_idx" ON "UserDevice"("user_id");

-- CreateIndex
CREATE INDEX "UserDevice_device_id_idx" ON "UserDevice"("device_id");

-- CreateIndex
CREATE INDEX "UserDevice_is_active_idx" ON "UserDevice"("is_active");

-- CreateIndex
CREATE INDEX "UserDevice_is_restricted_idx" ON "UserDevice"("is_restricted");

-- CreateIndex
CREATE INDEX "UserDevice_last_seen_at_idx" ON "UserDevice"("last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_user_id_device_id_key" ON "UserDevice"("user_id", "device_id");

-- AddForeignKey
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
