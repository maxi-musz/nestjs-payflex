-- AlterEnum: admin manual wallet / cashback balance adjustments
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_USER_WALLET_ADJUST';
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_USER_CASHBACK_ADJUST';
