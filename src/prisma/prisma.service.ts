import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import * as colors from "colors"

let db_url: string;

db_url = process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL_EXTERNAL || process.env.DATABASE_URL || "default_production_url"
    : process.env.DATABASE_URL || "default_development_url";

@Injectable()
export class PrismaService extends PrismaClient {

    constructor(config: ConfigService) {
        super({
            datasources: {
                db: {
                    url: config.get('DATABASE_URL')
                }
            }
        })
        console.log(colors.blue(`prisma.service --- DB_URL: ${config.get('DATABASE_URL')}`))
    }
}
