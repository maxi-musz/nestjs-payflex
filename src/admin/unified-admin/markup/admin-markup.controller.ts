import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { AdminMarkupService } from './admin-markup.service';
import {
  UpdateMarkupConfigDto,
  CreateMarkupRuleDto,
  UpdateMarkupRuleDto,
} from './dto/markup.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('unified-admin/markup')
export class AdminMarkupController {
  constructor(private readonly markupService: AdminMarkupService) {}

  private assertAdmin(user: any) {
    if (user?.role !== Role.admin) throw new ForbiddenException('Admin access required');
  }

  @Get('config')
  async getConfig(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.markupService.getConfig();
  }

  @Put('config')
  async updateConfig(@Body() dto: UpdateMarkupConfigDto, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.markupService.updateConfig(req.user.sub, dto, req);
  }

  @Get('rules')
  async listRules(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.markupService.listRules();
  }

  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  async createRule(@Body() dto: CreateMarkupRuleDto, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.markupService.createRule(req.user.sub, dto, req);
  }

  @Post('rules/seed')
  @HttpCode(HttpStatus.OK)
  async seedDefaultRules(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.markupService.seedDefaultRules(req.user.sub, req);
  }

  @Put('rules/:id')
  async updateRule(
    @Param('id') id: string,
    @Body() dto: UpdateMarkupRuleDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.markupService.updateRule(id, req.user.sub, dto, req);
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.OK)
  async deleteRule(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.markupService.deleteRule(id, req.user.sub, req);
  }
}
