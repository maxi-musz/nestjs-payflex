import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { first, firstValueFrom, lastValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { CardHolderDto, CreateCardDto } from './dto/card.dto';
import { BridgeCardResponse } from './interfaces/bridge-card.interface';
import * as colors from "colors"
import * as AES256 from 'aes-everywhere';
import axios from 'axios';
import * as crypto from 'crypto';


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

  async fundIssuingWallet() {
    console.log(colors.cyan(`Funding BridgeCard issuing wallet`));

    const url = 'https://issuecards.api.bridgecard.co/v1/issuing/sandbox/cards/fund_issuing_wallet?currency=USD';

    const headers = {
      'token': `Bearer ${this.configService.get<string>('BRIDGECARD_TEST_AUTH_TOKEN')}`, // Replace with your actual token or use env var
      'Content-Type': 'application/json'
    };

    const data = {
      amount: '10000',
      currency: 'USD', // You should pass either "NGN" or "USD", not both
    };

    try {
      const response = await lastValueFrom(
        this.httpService.patch(url, data, { headers })
      );
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error('BridgeCard funding error:', error.response?.data.data || error.message);
      throw error;
    }
  }

  async createCard(userId: any, dto: CreateCardDto): Promise<any> {
    console.log(colors.cyan(`Creating new ${dto.currency} card...`));
  
    try {
      // Step 1: Get user from DB
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { address: true },
      });
  
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
  
      // Step 2: Check if user already has card
      const existingCard = await this.prisma.card.findFirst({
        where: { user_id: userId, card_currency: dto.currency },
      });
  
      if (existingCard?.bridge_card_id) {
        throw new HttpException(
          `You already have ${dto.currency} card`,
          HttpStatus.BAD_REQUEST
        );
      }
  
      let bridgeCardHolderId = existingCard?.bridge_card_id || '';
  
      // Step 3: Check if user already exists on BridgeCard
      console.log("Checking if user already exists on bridge card")
      if (!bridgeCardHolderId) {
        try {
          const checkUrl = `${this.apiUrl}/issuing/sandbox/cardholder/get_cardholder?cardholder_id=${existingCard?.bridge_cardholder_id}`;
  
          const res = await axios.get(checkUrl, {
            headers: this.getHeaders(),
          });
  
          if (res.data?.status && res.data?.data?.id) {
            bridgeCardHolderId = res.data.data.id;
            console.log(colors.green(`User exists on BridgeCard with ID: ${bridgeCardHolderId}`));
          }
        } catch (error) {
          console.log(colors.yellow("User not found on BridgeCard. Creating..."));
        }
      }
  
      // Step 4: If not found, create user on BridgeCard
      console.log("No card holder found, proceeding to create a new card holder")
    if (!bridgeCardHolderId) {
      const cardHolderRes = await this.createCardHolder(user, userId);
      if (cardHolderRes?.existing && cardHolderRes.cardholder_id) {
        bridgeCardHolderId = cardHolderRes.cardholder_id;
        console.log(colors.green(`Using existing BridgeCard cardholder ID: ${bridgeCardHolderId}`));
      } else if (cardHolderRes?.cardholder_id) {
        bridgeCardHolderId = cardHolderRes.cardholder_id;
        console.log(colors.green(`Created new BridgeCard cardholder ID: ${bridgeCardHolderId}`));
      } else {
        const errMsg = cardHolderRes?.message || 'Unknown error creating cardholder';
        throw new HttpException(`Failed to create card holder: ${errMsg}`, HttpStatus.BAD_REQUEST);
      }

      console.log("Bridge--create card holder res: ", cardHolderRes);
    }
  
      // Step 5: Create card on BridgeCard
      const createCardEndpoint = `${this.apiUrl}/issuing/sandbox/cards/create_card`;

      const apiKey = this.configService.get<string>('BRIDGECARD_TEST_SECRET_KEY');
      if (!apiKey) {
        throw new Error('BRIDGECARD_TEST_SECRET_KEY is not defined in the configuration');
      }
      

        const encryptedPin = AES256.encrypt(dto.pin, apiKey);
        console.log(colors.blue(`Encrypted Pin: ${encryptedPin}`));

        // Check the raw PIN first
        console.log(`Raw PIN: ${dto.pin}`);
  
      const cardReqBody = {
        cardholder_id: bridgeCardHolderId,
        card_type: 'virtual',
        card_brand: 'Mastercard',
        card_currency: dto.currency,
        card_limit: '1000000',
        transaction_reference: `card-creation-${Date.now()}`,
        funding_amount: dto.funding_amount,
        pin: encryptedPin,
        meta_data: {
          user_id: userId,
        },
      };
  
      console.log(colors.yellow('Creating cardd...'));
  
      const cardRes = await firstValueFrom(
        this.httpService.post(
            createCardEndpoint, 
            cardReqBody, 
        {
          headers: this.getHeaders(),
        }),
      );
  
      if (!cardRes.data?.status) {
        throw new HttpException(cardRes.data.message, HttpStatus.BAD_REQUEST);
      }
  
      console.log(cardRes)
      const cardData = cardRes.data.data;
      console.log(colors.blue(`Newly created card data: ${cardData}`))
  
      const cardToSave = {
        bridge_card_id: bridgeCardHolderId,
        user_id: userId,
        card_currency: dto.currency,
        masked_pan: cardData.maskedPan,
        expiry_month: cardData.expiryMonth,
        expiry_year: cardData.expiryYear,
        card_type: cardData.cardType,
        card_brand: 'Mastercard',
        first_funding_amount: dto.funding_amount,
        current_balance: dto.funding_amount,
        card_limit: 1000000,
        status: cardData.status,
        is_active: cardData.isActive,
        transaction_reference: `card-creation-${Date.now()}`,
        metadata: cardData,
        bridge_cardholder_id: bridgeCardHolderId,
      };
  
      const savedCard = existingCard
        ? await this.prisma.card.update({
            where: { id: existingCard.id },
            data: cardToSave,
          })
        : await this.prisma.card.create({ data: cardToSave });
  
      console.log(colors.magenta(` New ${dto.currency} card successfully created`));
      return savedCard;
    } catch (error) {
      console.error(colors.red('Error creating card:'), error);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Card creation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  async createCardHolder(user: any, userId: string) {
    console.log("Card holder does not exist, creating a new one...")
    const endpoint = `${this.apiUrl}/issuing/sandbox/cardholder/register_cardholder`;
  
    const body = {
      first_name: user.first_name || 'Unknown',
      last_name: user.last_name || 'User',
      address: {
        address: user.address?.address || 'Unknown',
        city: user.address?.city || 'Lagos',
        state: user.address?.state || 'Lagos',
        country: 'Nigeria',
        postal_code: user.address?.postal_code || '100001',
        house_no: user.address?.house_no || '1',
      },
      phone: user.phone || '08000000000',
      email_address: user.email || 'example@mail.com',
      identity: {
        id_type: 'NIGERIAN_BVN_VERIFICATION',
        bvn: user.bvn || '22222222222',
        selfie_image: user.selfie_url || 'https://image.com',
      },
      meta_data: {
        user_id: userId,
      },
    };
  
    console.log("Sending to create card holder endpoint...")
    try {
      const response = await this.httpService.axiosRef.post(endpoint, body, {
        headers: this.getHeaders(),
      });
  
      return response.data;
    } catch (error) {
      const errData = error?.response?.data || {};
      const errMsg = errData.message || error.message || 'Unknown error';
  
      // ⚠️ Handle "already exists" error gracefully
      if (errMsg.includes('cardholder already exists') && errData?.data?.cardholder_id) {
        console.warn('⚠️ Cardholder already exists. Using existing ID:', errData.data.cardholder_id);
        return { existing: true, cardholder_id: errData.data.cardholder_id };
      }
  
      console.error('❌ Failed to create cardholder on BridgeCard');
      console.error('👉 Message:', errMsg);
      console.error('👉 Full response:', JSON.stringify(errData, null, 2));
  
      throw new HttpException(
        `BridgeCard Error: ${errMsg}`,
        error?.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
  
  
  
  
}
