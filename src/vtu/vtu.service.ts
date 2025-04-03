import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as colors from "colors"

@Injectable()
export class VtuService {
    constructor(
        private prisma: PrismaService

    ) {}

    async test(userPayload: any) {
        console.log(colors.cyan("Testing..."))
    }
}
