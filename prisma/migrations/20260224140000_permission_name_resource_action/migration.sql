-- AlterTable: Permission model now uses name, resource (string), action (string)
-- Step 1: Add new columns (nullable first for backfill)
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "action" TEXT;

-- Backfill existing rows: name = resource key, action = 'manage'
UPDATE "permissions" SET "name" = "resource"::text || '_manage', "action" = 'manage' WHERE "name" IS NULL;
UPDATE "permissions" SET "action" = 'manage' WHERE "action" IS NULL;

-- Set NOT NULL
ALTER TABLE "permissions" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "permissions" ALTER COLUMN "action" SET NOT NULL;

-- Step 2: Change resource from enum to text
ALTER TABLE "permissions" ALTER COLUMN "resource" TYPE TEXT USING "resource"::text;

-- Step 3: Drop old boolean action columns
ALTER TABLE "permissions" DROP COLUMN IF EXISTS "can_view";
ALTER TABLE "permissions" DROP COLUMN IF EXISTS "can_create";
ALTER TABLE "permissions" DROP COLUMN IF EXISTS "can_edit";
ALTER TABLE "permissions" DROP COLUMN IF EXISTS "can_delete";

-- Step 4: Make user_id nullable (for permission definitions)
ALTER TABLE "permissions" ALTER COLUMN "user_id" DROP NOT NULL;

-- Step 5: Replace unique constraint
DROP INDEX IF EXISTS "permissions_user_id_resource_key";
CREATE UNIQUE INDEX "permissions_user_id_resource_action_key" ON "permissions"("user_id", "resource", "action");
