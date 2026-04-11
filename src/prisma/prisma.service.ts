import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as colors from 'colors';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL');
    if (!url) {
      throw new Error('DATABASE_URL is not set');
    }
    const adapter = new PrismaPg({ connectionString: url });
    super({ adapter });
    console.log(colors.blue(`prisma.service --- DB_URL: ${url}`));
  }
}
