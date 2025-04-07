import { Body, Controller, HttpCode, HttpStatus, Post, Request, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { BridgeCardService } from "./virtual-card.service";
import { CreateCardDto } from "./dto/card.dto";

@Controller('cards')
@UseGuards(AuthGuard('jwt'))
export class BridgeCardController {
  constructor(private readonly bridgeCardService: BridgeCardService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createCard(
    @Request() req,
    @Body() dto: CreateCardDto,
  ) {
    const userId = req.user.sub;
    return await this.bridgeCardService.createCard(userId, dto);
    }
  
  }

