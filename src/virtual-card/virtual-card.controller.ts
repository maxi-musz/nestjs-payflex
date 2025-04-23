import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { BridgeCardService } from "./virtual-card.service";
import { CreateCardDto } from "./dto/card.dto";

@Controller('cards')
@UseGuards(AuthGuard('jwt'))
export class BridgeCardController {
  constructor(private readonly bridgeCardService: BridgeCardService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  fetchAllCards(@Request() req) {
    return this.bridgeCardService.fetchAllCards(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('create')
  createCard(
    @Request() req,
    @Body() dto: CreateCardDto,
  ) {
    const userId = req.user.sub;
    return this.bridgeCardService.createCard(userId, dto);
    }

  @UseGuards(AuthGuard('jwt'))
  @Post('fund-sandbox-issuing-wallet')
  async fundIssuingWallet() {
    return await this.bridgeCardService.fundIssuingWallet();
  }
  
  }

  

