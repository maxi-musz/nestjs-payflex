-- Service Markup: admin-configurable margin per service (data, airtime, cable, etc.)
-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'MARKUP_CONFIG_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'MARKUP_RULE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'MARKUP_RULE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'MARKUP_RULE_DELETE';

ALTER TYPE "PermissionResource" ADD VALUE 'MARKUP';

-- CreateTable
CREATE TABLE "markup_config" (
    "id" TEXT NOT NULL DEFAULT 'markup_config',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "default_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "default_percentage_friendlies" DOUBLE PRECISION,
    "min_amount_to_apply_markup" DOUBLE PRECISION DEFAULT 0,
    "updated_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markup_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "markup_rules" (
    "id" TEXT NOT NULL,
    "service_type" "CashbackServiceType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentage_friendlies" DOUBLE PRECISION,
    "min_amount_to_apply_markup" DOUBLE PRECISION,
    "updated_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markup_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "markup_rules_service_type_key" ON "markup_rules"("service_type");
