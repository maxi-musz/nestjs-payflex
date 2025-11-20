/*
  Warnings:

  - You are about to drop the column `step_1_completed` on the `RegistrationProgress` table. All the data in the column will be lost.
  - You are about to drop the column `step_2_completed` on the `RegistrationProgress` table. All the data in the column will be lost.
  - You are about to drop the column `step_3_completed` on the `RegistrationProgress` table. All the data in the column will be lost.
  - You are about to drop the column `step_3_verified` on the `RegistrationProgress` table. All the data in the column will be lost.
  - You are about to drop the column `step_4_completed` on the `RegistrationProgress` table. All the data in the column will be lost.
  - You are about to drop the column `step_5_completed` on the `RegistrationProgress` table. All the data in the column will be lost.
  - You are about to drop the column `step_6_completed` on the `RegistrationProgress` table. All the data in the column will be lost.
  - You are about to drop the column `step_7_completed` on the `RegistrationProgress` table. All the data in the column will be lost.
  - You are about to drop the column `step_8_completed` on the `RegistrationProgress` table. All the data in the column will be lost.
  - You are about to drop the column `step_9_completed` on the `RegistrationProgress` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('not_started', 'pending', 'completed');

-- AlterTable
ALTER TABLE "RegistrationProgress" DROP COLUMN "step_1_completed",
DROP COLUMN "step_2_completed",
DROP COLUMN "step_3_completed",
DROP COLUMN "step_3_verified",
DROP COLUMN "step_4_completed",
DROP COLUMN "step_5_completed",
DROP COLUMN "step_6_completed",
DROP COLUMN "step_7_completed",
DROP COLUMN "step_8_completed",
DROP COLUMN "step_9_completed",
ADD COLUMN     "step_1_status" "StepStatus" NOT NULL DEFAULT 'not_started',
ADD COLUMN     "step_2_status" "StepStatus" NOT NULL DEFAULT 'not_started',
ADD COLUMN     "step_3_status" "StepStatus" NOT NULL DEFAULT 'not_started',
ADD COLUMN     "step_4_status" "StepStatus" NOT NULL DEFAULT 'not_started',
ADD COLUMN     "step_5_status" "StepStatus" NOT NULL DEFAULT 'not_started',
ADD COLUMN     "step_6_status" "StepStatus" NOT NULL DEFAULT 'not_started',
ADD COLUMN     "step_7_status" "StepStatus" NOT NULL DEFAULT 'not_started',
ADD COLUMN     "step_8_status" "StepStatus" NOT NULL DEFAULT 'not_started',
ADD COLUMN     "step_9_status" "StepStatus" NOT NULL DEFAULT 'not_started';
