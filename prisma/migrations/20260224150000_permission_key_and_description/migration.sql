-- Add key and description; remove action
-- Step 1: Add new columns
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "key" TEXT;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Backfill key from name (slugify: lowercase, spaces -> underscores)
UPDATE "permissions" SET "key" = LOWER(REPLACE(TRIM("name"), ' ', '_')) WHERE "key" IS NULL;

-- Ensure key is set (fallback for any edge case)
UPDATE "permissions" SET "key" = COALESCE("resource", 'permission') || '_' || COALESCE("action", 'manage') WHERE "key" IS NULL OR "key" = '';

ALTER TABLE "permissions" ALTER COLUMN "key" SET NOT NULL;

-- Step 2: Drop old unique and index
DROP INDEX IF EXISTS "permissions_user_id_resource_action_key";

-- Step 3: Drop action column
ALTER TABLE "permissions" DROP COLUMN IF EXISTS "action";

-- Step 4: New unique and index
CREATE UNIQUE INDEX "permissions_user_id_key_key" ON "permissions"("user_id", "key");
CREATE INDEX "permissions_key_idx" ON "permissions"("key");
