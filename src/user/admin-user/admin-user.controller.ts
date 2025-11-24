import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminUserService } from './admin-user.service';

/**
 * Admin User Controller
 * Handles admin-specific user endpoints
 */
@Controller('user/admin')
export class AdminUserController {
    constructor(private adminUserService: AdminUserService) {}

    // Admin user endpoints will be added here
}

