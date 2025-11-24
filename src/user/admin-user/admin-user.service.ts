import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as colors from 'colors';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';

/**
 * Admin User Service
 * Handles admin-specific user operations
 */
@Injectable()
export class AdminUserService {
    private readonly logger = new Logger(AdminUserService.name);

    constructor(
        private prisma: PrismaService,
    ) {}

    // Admin user methods will be added here
}

