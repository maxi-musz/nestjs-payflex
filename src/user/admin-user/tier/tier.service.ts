import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as colors from 'colors';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { CreateTierDto, UpdateTierDto } from './dto/tier.dto';

/**
 * Tier Service
 * Handles tier-related operations for admin
 */
@Injectable()
export class TierService {
    private readonly logger = new Logger(TierService.name);

    constructor(
        private prisma: PrismaService,
    ) {}

    /**
     * Create a new tier
     */
    async createTier(dto: CreateTierDto): Promise<ApiResponseDto<any>> {
        this.logger.log(colors.cyan(`Creating new tier: ${dto.tier}`));

        try {
            // Check if tier already exists
            const existingTier = await this.prisma.tier.findUnique({
                where: { tier: dto.tier },
            });

            if (existingTier) {
                this.logger.error(colors.red(`Tier ${dto.tier} already exists`));
                throw new BadRequestException(`Tier with code "${dto.tier}" already exists`);
            }

            // Create the tier
            const tier = await this.prisma.tier.create({
                data: {
                    tier: dto.tier,
                    name: dto.name,
                    description: dto.description || null,
                    is_active: dto.is_active !== undefined ? dto.is_active : true,
                    requirements: dto.requirements || [],
                    single_transaction_limit: dto.single_transaction_limit,
                    daily_limit: dto.daily_limit,
                    monthly_limit: dto.monthly_limit,
                    airtime_daily_limit: dto.airtime_daily_limit,
                },
            });

            this.logger.log(colors.magenta(`Tier ${dto.tier} created successfully`));

            return new ApiResponseDto(
                true,
                'Tier created successfully',
                {
                    id: tier.id,
                    tier: tier.tier,
                    name: tier.name,
                    description: tier.description,
                    is_active: tier.is_active,
                    requirements: tier.requirements,
                    limits: {
                        single_transaction_limit: tier.single_transaction_limit,
                        daily_limit: tier.daily_limit,
                        monthly_limit: tier.monthly_limit,
                        airtime_daily_limit: tier.airtime_daily_limit,
                    },
                    createdAt: tier.createdAt,
                    updatedAt: tier.updatedAt,
                }
            );
        } catch (error) {
            this.logger.error(colors.red(`Error creating tier: ${error.message}`));
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`Failed to create tier: ${error.message}`);
        }
    }

    /**
     * Update a tier (PATCH)
     */
    async updateTier(tierId: string, dto: UpdateTierDto): Promise<ApiResponseDto<any>> {
        this.logger.log(colors.cyan(`Updating tier: ${tierId}`));

        try {
            // Check if tier exists
            const existingTier = await this.prisma.tier.findUnique({
                where: { id: tierId },
            });

            if (!existingTier) {
                this.logger.error(colors.red(`Tier ${tierId} not found`));
                throw new NotFoundException(`Tier with id "${tierId}" not found`);
            }

            // If tier code is being updated, check if new code already exists
            if (dto.tier && dto.tier !== existingTier.tier) {
                const tierWithCode = await this.prisma.tier.findUnique({
                    where: { tier: dto.tier },
                });

                if (tierWithCode) {
                    this.logger.error(colors.red(`Tier code ${dto.tier} already exists`));
                    throw new BadRequestException(`Tier with code "${dto.tier}" already exists`);
                }
            }

            // Prepare update data
            const updateData: any = {};
            if (dto.tier !== undefined) updateData.tier = dto.tier;
            if (dto.name !== undefined) updateData.name = dto.name;
            if (dto.description !== undefined) updateData.description = dto.description;
            if (dto.is_active !== undefined) updateData.is_active = dto.is_active;
            if (dto.requirements !== undefined) updateData.requirements = dto.requirements;
            if (dto.single_transaction_limit !== undefined) updateData.single_transaction_limit = dto.single_transaction_limit;
            if (dto.daily_limit !== undefined) updateData.daily_limit = dto.daily_limit;
            if (dto.monthly_limit !== undefined) updateData.monthly_limit = dto.monthly_limit;
            if (dto.airtime_daily_limit !== undefined) updateData.airtime_daily_limit = dto.airtime_daily_limit;

            // Update the tier
            const updatedTier = await this.prisma.tier.update({
                where: { id: tierId },
                data: updateData,
            });

            this.logger.log(colors.magenta(`Tier ${tierId} updated successfully`));

            return new ApiResponseDto(
                true,
                'Tier updated successfully',
                {
                    id: updatedTier.id,
                    tier: updatedTier.tier,
                    name: updatedTier.name,
                    description: updatedTier.description,
                    is_active: updatedTier.is_active,
                    requirements: updatedTier.requirements,
                    limits: {
                        single_transaction_limit: updatedTier.single_transaction_limit,
                        daily_limit: updatedTier.daily_limit,
                        monthly_limit: updatedTier.monthly_limit,
                        airtime_daily_limit: updatedTier.airtime_daily_limit,
                    },
                    createdAt: updatedTier.createdAt,
                    updatedAt: updatedTier.updatedAt,
                }
            );
        } catch (error) {
            this.logger.error(colors.red(`Error updating tier: ${error.message}`));
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`Failed to update tier: ${error.message}`);
        }
    }

    /**
     * Get all tiers
     */
    async getAllTiers(): Promise<ApiResponseDto<any>> {
        this.logger.log(colors.cyan('Fetching all tiers'));

        try {
            const tiers = await this.prisma.tier.findMany({
                orderBy: [
                    { is_active: 'desc' },
                    { createdAt: 'asc' },
                ],
            });

            this.logger.log(colors.magenta(`Found ${tiers.length} tiers`));

            const formattedTiers = tiers.map(tier => ({
                id: tier.id,
                tier: tier.tier,
                name: tier.name,
                description: tier.description,
                is_active: tier.is_active,
                requirements: tier.requirements,
                limits: {
                    single_transaction_limit: tier.single_transaction_limit,
                    daily_limit: tier.daily_limit,
                    monthly_limit: tier.monthly_limit,
                    airtime_daily_limit: tier.airtime_daily_limit,
                },
                createdAt: tier.createdAt,
                updatedAt: tier.updatedAt,
            }));

            return new ApiResponseDto(
                true,
                'Tiers retrieved successfully',
                {
                    tiers: formattedTiers,
                    total: formattedTiers.length,
                }
            );
        } catch (error) {
            this.logger.error(colors.red(`Error fetching tiers: ${error.message}`));
            throw new BadRequestException(`Failed to fetch tiers: ${error.message}`);
        }
    }
}

