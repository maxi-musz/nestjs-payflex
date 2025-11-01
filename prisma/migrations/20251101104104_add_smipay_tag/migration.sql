/*
  Warnings:

  - A unique constraint covering the columns `[smipay_tag]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "smipay_tag" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_smipay_tag_key" ON "User"("smipay_tag");
