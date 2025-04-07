import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { first, firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { CardHolderDto, CreateCardDto } from './dto/card.dto';
import { BridgeCardResponse } from './interfaces/bridge-card.interface';
import * as colors from "colors"
import * as AES256 from 'aes256';


@Injectable()
export class BridgeCardService {
  private readonly logger = new Logger(BridgeCardService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.apiUrl = this.configService.get<string>('BRIDGECARD_API_URL') || '';
    if (!this.apiUrl) {
      throw new Error('BRIDGECARD_API_URL is not defined in the configuration');
    }
    this.apiKey = this.configService.get('BRIDGECARD_TEST_AUTH_TOKEN') || '';
    if (!this.apiKey) {
      throw new Error('BRIDGECARD_TEST_AUTH_TOKEN is not defined in the configuration');
    }
  }

  private getHeaders() {
    return {
      'token': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createCardHolder(userId: any, dto:CardHolderDto): Promise<any> {
    console.log(colors.cyan(`Creating new card holder`));

        const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
            address: true,
            profile_image: true
        },
        });

        if (!existingUser) {
            console.log(colors.red('User not found'));
            throw new HttpException('User not found', HttpStatus.NOT_FOUND); 
        }

        try {

            const createCardHolderReqBody = {
                first_name: existingUser.first_name,
                last_name: existingUser.last_name,
                address: {
                    address: existingUser.address?.home_address,
                    city: existingUser.address?.city,
                    state: existingUser.address?.state,
                    country: existingUser.address?.country,
                    // postal_code: existingUser.address?.postal_code,
                },
                email_address: existingUser.email,
                phone: existingUser.phone_number,
                identity: {
                    id_type: "NIGERIAN_BVN_VERIFICATION",
                    // bvn: existingUser.bvn,
                    selfie_image: existingUser.profile_image?.secure_url,
                },
                meta_data: {
                    user_id: userId,
                },
            }

            let cardHolderCreationResponse:any;

            const endpoint = `${this.apiUrl}/issuing/sandbox/cardholder/register_cardholder_synchronously`;

            cardHolderCreationResponse = await firstValueFrom(
                this.httpService.post<BridgeCardResponse>(
                  `${endpoint}`,
                  createCardHolderReqBody,
                  {
                    headers: this.getHeaders()
                  },
                ),
              );            
            } catch (error) {
                console.error(colors.red(`Error in request body: ${error}`));
                console.error(colors.red(`Error in request body: ${error}`));
                console.error(colors.red(`Response data: ${JSON.stringify(error.response?.data)}`));
                console.error(colors.red(`Status: ${error.response?.status}`));
                console.error(colors.red(`Headers: ${JSON.stringify(error.response?.headers)}`));
                throw new HttpException(`Error in request body: ${error.response?.data?.message || error.message}`, HttpStatus.BAD_REQUEST);  
            }
    }
    

  async createCard(userId: any, dto: CreateCardDto): Promise<any> {
    console.log(colors.cyan(`Creating new ${dto.currency} card`));

    try {
      const user = await this.prisma.user.findUnique({
        where: { id:  userId},
      });
  
      if (!user) {
        console.log(colors.red('User not found'));
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
  
      const existing = await this.prisma.card.findFirst({
        where: {
          user_id: userId,
          currency: dto.currency,
        },
      });
  
      if (existing) {
        console.log(colors.red(`User already has ${dto.currency} card`));
        throw new HttpException(
          `You already have ${dto.currency} card`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const apiKey = this.configService.get<string>('BRIDGECARD_TEST_SECRET_KEY');
      if (!apiKey) {
        throw new Error('BRIDGECARD_TEST_SECRET_KEY is not defined in the configuration');
      }
      const encryptedPin = AES256.encrypt('4 digit pin', apiKey);
      console.log(colors.blue(`Encrypted Pin: ${encryptedPin}`));
  
      const endpoint = `${this.apiUrl}/issuing/sandbox/cards/create_card`;
      console.log("Endpoint: ", endpoint);

      const reqBody = {
        cardholder_id: userId,
        card_type: 'virtual',
        card_brand: 'Mastercard',
        card_currency: dto.currency,
        card_limit: '1000000',
        transaction_reference: 'card-creation',
        funding_amount: dto.funding_amount,
        pin: encryptedPin,
        meta_data: {
          user_id: userId,
        },
      }

      let cardCreationResponse:any;
  
      try {

        // console.log(colors.yellow(`API Key: ${this.apiKey}`));

        cardCreationResponse = await firstValueFrom(
            this.httpService.post<BridgeCardResponse>(
              `${endpoint}`,
              reqBody,
              {
                headers: this.getHeaders()
              },
            ),
          );
        
      } catch (error) {
        console.error(colors.red(`Error in request body: ${error}`));
        console.error(colors.red(`Error in request body: ${error}`));
        console.error(colors.red(`Response data: ${JSON.stringify(error.response?.data)}`));
        console.error(colors.red(`Status: ${error.response?.status}`));
        console.error(colors.red(`Headers: ${JSON.stringify(error.response?.headers)}`));
        throw new HttpException(`Error in request body: ${error.response?.data?.message || error.message}`, HttpStatus.BAD_REQUEST);
      }
  
      if (!cardCreationResponse.data.status) {
        throw new HttpException(cardCreationResponse.data.message, HttpStatus.BAD_REQUEST);
      }
  
      const cardData = cardCreationResponse.data.data;

      console.log("Response from card creation: ", cardData);
  
      const savedCard = await this.prisma.card.create({
        data: {
          bridge_card_id: cardData.id,
          user_id: userId,
          currency: dto.currency,
          masked_pan: cardData.maskedPan,
          expiry_month: cardData.expiryMonth,
          expiry_year: cardData.expiryYear,
          card_type: cardData.cardType,
          balance: cardData.balance,
          status: cardData.status,
          is_active: cardData.isActive,
          metadata: cardData,
        },
      });
  
      return savedCard;
    } catch (error) {
      this.logger.error(`Error creating card: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to create card', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
}
