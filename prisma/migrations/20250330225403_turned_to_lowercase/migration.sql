/*
  Warnings:

  - The values [NGN,USD,EURGBP] on the enum `AccountType` will be removed. If these variants are still used in the database, this will fail.
  - The values [NGN,USD,GBP,EUR] on the enum `CurrencyType` will be removed. If these variants are still used in the database, this will fail.
  - The values [MALE,FEMALE] on the enum `Gender` will be removed. If these variants are still used in the database, this will fail.
  - The values [USER,ADMIN,SUPER_ADMIN] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AccountType_new" AS ENUM ('ngn', 'usd', 'eur', 'gbp');
ALTER TABLE "Account" ALTER COLUMN "accountType" TYPE "AccountType_new" USING ("accountType"::text::"AccountType_new");
ALTER TYPE "AccountType" RENAME TO "AccountType_old";
ALTER TYPE "AccountType_new" RENAME TO "AccountType";
DROP TYPE "AccountType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "CurrencyType_new" AS ENUM ('ngn', 'usd', 'gbp', 'eur');
ALTER TABLE "TransactionHistory" ALTER COLUMN "currency_type" TYPE "CurrencyType_new" USING ("currency_type"::text::"CurrencyType_new");
ALTER TYPE "CurrencyType" RENAME TO "CurrencyType_old";
ALTER TYPE "CurrencyType_new" RENAME TO "CurrencyType";
DROP TYPE "CurrencyType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Gender_new" AS ENUM ('male', 'female');
ALTER TABLE "User" ALTER COLUMN "gender" TYPE "Gender_new" USING ("gender"::text::"Gender_new");
ALTER TYPE "Gender" RENAME TO "Gender_old";
ALTER TYPE "Gender_new" RENAME TO "Gender";
DROP TYPE "Gender_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('user', 'admin', 'super_admin');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'user';
COMMIT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'user';
