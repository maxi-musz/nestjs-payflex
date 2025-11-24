import { Body, Controller, Get, Post, Patch, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TierService } from './tier.service';
import { CreateTierDto, UpdateTierDto } from './dto/tier.dto';

/**
 * Admin Tier Controller
 * Handles admin tier management endpoints
 */
@Controller('user/admin/tier')
@UseGuards(AuthGuard('jwt'))
export class AdminTierController {
    constructor(private tierService: TierService) {}

    @Post()
    createTier(@Body() dto: CreateTierDto) {
        return this.tierService.createTier(dto);
    }

    @Patch(':id')
    updateTier(@Param('id') id: string, @Body() dto: UpdateTierDto) {
        return this.tierService.updateTier(id, dto);
    }

    @Get()
    getAllTiers() {
        return this.tierService.getAllTiers();
    }
}

