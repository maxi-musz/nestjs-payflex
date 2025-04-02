import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as colors from "colors"

let db_url: string;

db_url = process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL_EXTERNAL || process.env.DATABASE_URL || "default_production_url"
    : process.env.DATABASE_URL || "default_development_url";

console.log(colors.yellow(`DB URL: ${db_url}`))

@Injectable()
export class PrismaService extends PrismaClient {

    constructor() {
        super({
            datasources: {
                db: {
                    url: db_url
                }
            }
        })
    }
}
