import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CreateTransferDto } from 'src/common/dto/banking.dto';
import { FlutterTransferResponse } from 'src/common/interfaces/banking.interface';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FlutterwaveService {
    private readonly logger = new Logger(FlutterwaveService.name);
    private flutterwaveBaseUrl: string;
    private readonly axiosInstance: AxiosInstance;
    private flutterwaveSecretKey: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        this.flutterwaveBaseUrl = 'https://api.flutterwave.com/v3';
        this.flutterwaveSecretKey = this.configService.get<string>('FLW_SECRET_KEY') || '';

        this.axiosInstance = axios.create({
            baseURL: this.flutterwaveBaseUrl,
            headers: {
              Authorization: `Bearer ${this.flutterwaveSecretKey}`,
              'Content-Type': 'application/json',
            },
          });
    }

    async initiateTransfer(dto: CreateTransferDto, userPayload: any,): Promise<FlutterTransferResponse> {
        try {
          // Check if user exists and has sufficient balance in the account model for that curreny not wallet
          const user = await this.prisma.user.findUnique({
            where: { email: userPayload.email },
            include: { accounts: true },
          });
      
          if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
          }
      
          const existingAccount = await this.prisma.account.findFirst({
            where: {
              user_id: user.id,
              currency: dto.currency,
            },
          });
      
          if (!existingAccount) {
            throw new HttpException(`No existing wallet found, please proceed and firrst create account for ${dto.currency}`, HttpStatus.BAD_REQUEST);
          }
      
          if (existingAccount.balance < dto.amount) {
            throw new HttpException('Insufficient balance', HttpStatus.BAD_REQUEST);
          }
      
          // Make API request to Flutterwave using axios
          const response = await this.axiosInstance.post('/transfers', {
            account_bank: dto.accountBank,
            account_number: dto.accountNumber,
            amount: dto.amount,
            narration: dto.narration,
            currency: dto.currency,
            reference: dto.reference,
            callback_url: dto.callbackUrl,
            beneficiary_name: dto.beneficiaryName,
          });
      
          const result = response.data;
      
          if (result.status === 'success') {
            // Update wallet & record transaction
            await this.prisma.$transaction([
              this.prisma.account.update({
                where: { id: existingAccount.id },
                data: { balance: { decrement: dto.amount } },
              }),
              this.prisma.transactionHistory.create({
                data: {
                  account_id: existingAccount.id,
                  user_id: user.id,
                  amount: dto.amount,
                  currency_type: dto.currency,
                  transaction_type: 'transfer',
                  status: 'pending',
                  transaction_reference: dto.reference,
                  description: dto.narration,
                //   metadata: { flutterwaveResponse: result },
                },
              }),
            ]);
          }
          
          this.logger.log(`Transfer initiated successfully: ${result.message}`);
          return result;
        } catch (error) {
          this.logger.error(`Transfer initiation failed: ${error.message}`, error.stack);
      
          if (error instanceof HttpException) {
            throw error;
          }
      
          if (error.response) {
            throw new HttpException(
              error.response.data?.message || 'Flutterwave API error',
              error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }
      
          throw new HttpException('Transfer service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
        }
      }

}
