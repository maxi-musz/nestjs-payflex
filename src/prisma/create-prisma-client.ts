import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma ORM 7 requires a driver adapter. Use this for Nest DI and standalone scripts.
 */
export function createPrismaClient(connectionString?: string): PrismaClient {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required to create PrismaClient');
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}
