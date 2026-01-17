import { Injectable, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import axios from 'axios';
import { PurchaseAirtimeDto } from './dto/purchase-airtime.dto';
import { SagecloudCredentialsHelper } from '../sagecloud-credentials.helper';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { formatAmount } from 'src/common/helper_functions/formatter';
import { generateUniqueTransactionReference } from 'src/common/helper_functions/generators';
import * as colors from 'colors';

@Injectable()
export class SagecloudAirtimeService {
  private readonly logger = new Logger(SagecloudAirtimeService.name);

  constructor(private readonly prisma: PrismaService) {
    this.logger.log(`SagecloudAirtimeService initialized`);
  }

  SAGECLOUD_ACCESS_TOKEN = process.env.SAGECLOUD_ACCESS_TOKEN;
  SAGECLOUD_BASE_URL = process.env.SAGECLOUD_BASE_URL;


  async purchaseAirtime(dto: PurchaseAirtimeDto, userPayload: any): Promise<ApiResponseDto<any>> {
    this.logger.log(`Purchasing airtime from Sagecloud: ${JSON.stringify(dto)}`);
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: userPayload.email },
      });

      if (!user) {
        this.logger.error(`User not found for email: ${userPayload.email}`);
        throw new BadRequestException('User not found');
      }

      const wallet = await this.prisma.wallet.findFirst({
        where: { user_id: user.id },
      });

      if (!wallet) {
        this.logger.error(`Wallet not found for user: ${user.id}`);
        throw new BadRequestException('Wallet not found');
      }

      // 3. Validate sufficient balance
      if (Number(wallet.current_balance) < dto.amount) {
        this.logger.error(`Insufficient balance. You have ${formatAmount(wallet.current_balance)}, but trying to purchase ${formatAmount(dto.amount)}`);
        throw new BadRequestException(
          `Insufficient balance. You have ${formatAmount(wallet.current_balance)}, but trying to purchase ${formatAmount(dto.amount)}`
        );
      }

      // 4. Generate reference if not provided
      const reference = dto.reference || await generateUniqueTransactionReference(this.prisma, 'sagecloud');

      // 5. Determine service code based on network
      const serviceCode = this.getServiceCode(dto.network);

      // 6. Create pending transaction
      const transaction = await this.prisma.transactionHistory.create({
        data: {
          user_id: user.id,
          amount: dto.amount,
          transaction_type: 'airtime',
          credit_debit: 'debit',
          description: `Airtime purchase - ${dto.network} ${dto.phone}`,
          status: 'pending',
          payment_method: 'wallet',
          payment_channel: 'other', // Sagecloud is not in PaymentChannel enum, using 'other'
          transaction_reference: reference,
          balance_before: Number(wallet.current_balance),
          balance_after: Number(wallet.current_balance) - dto.amount,
          recipient_mobile: dto.phone,
          meta_data: {
            network: dto.network,
            service: serviceCode,
            provider: 'sagecloud',
          },
        },
      });

      // 7. Debit wallet
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          current_balance: Number(wallet.current_balance) - dto.amount,
          balance_before: Number(wallet.current_balance),
          balance_after: Number(wallet.current_balance) - dto.amount,
        },
      });

      // 8. Call Sagecloud API
      this.logger.log(`Calling Sagecloud API for airtime purchase: ${reference}`);
      
      const response = await axios.post(
        `${process.env.SAGECLOUD_BASE_URL}/v2/airtime`,
        {
          reference: reference,
          network: dto.network,
          service: serviceCode,
          phone: dto.phone,
          amount: dto.amount.toString(),
        },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.SAGECLOUD_ACCESS_TOKEN}`,
          },
          timeout: 60000, // 60 seconds
        }
      );

      this.logger.log(`Sagecloud API response: ${JSON.stringify(response.data)}`);

      // 9. Update transaction based on response status
      const responseStatus = response.data.status?.toLowerCase() || '';
      const isSuccess = response.data.success && responseStatus === 'success';
      const isPending = responseStatus === 'pending' || responseStatus === 'processing' || responseStatus === 'in-progress';
      const isFailed = responseStatus === 'failed' || responseStatus === 'error' || (!response.data.success && !isPending);

      if (isSuccess) {
        // Transaction successful
        this.logger.log(`Updating transaction: ${transaction.id} to success`);
        await this.prisma.transactionHistory.update({
          where: { id: transaction.id },
          data: {
            status: 'success',
            transaction_number: response.data.reference || reference,
            meta_data: {
              ...(transaction.meta_data as object || {}),
              sagecloud_response: response.data,
              sagecloud_reference: response.data.reference,
            },
          },
        });

        this.logger.log(`Transaction updated successfully: ${transaction.id}`);

        return new ApiResponseDto(
          true,
          response.data.message || 'Airtime purchase successful',
          {
            transaction_id: transaction.id,
            reference: response.data.reference || reference,
            amount: formatAmount(dto.amount),
            network: dto.network,
            phone: dto.phone,
            status: 'success',
            balance_after: formatAmount(Number(wallet.current_balance) - dto.amount),
          }
        );
      } else if (isPending) {
        // Transaction is still processing - keep as pending, don't refund
        this.logger.log(`Transaction ${transaction.id} is pending/processing - keeping status as pending`);
        await this.prisma.transactionHistory.update({
          where: { id: transaction.id },
          data: {
            status: 'pending', // Keep as pending
            transaction_number: response.data.reference || reference,
            meta_data: {
              ...(transaction.meta_data as object || {}),
              sagecloud_response: response.data,
              sagecloud_reference: response.data.reference,
              processing_status: responseStatus,
            },
          },
        });

        // Return success response but indicate it's processing
        return new ApiResponseDto(
          true,
          response.data.message || 'Airtime purchase is being processed. Please check status later.',
          {
            transaction_id: transaction.id,
            reference: response.data.reference || reference,
            amount: formatAmount(dto.amount),
            network: dto.network,
            phone: dto.phone,
            status: 'pending',
            processing: true,
            message: 'Transaction is being processed. Your wallet has been debited. Please check transaction status later.',
            balance_after: formatAmount(Number(wallet.current_balance) - dto.amount),
          }
        );
      } else {
        // Transaction failed - refund user
        this.logger.log(`Transaction failed: ${transaction.id}, refunding user`);
        await this.prisma.$transaction(async (tx) => {
          await tx.transactionHistory.update({
            where: { id: transaction.id },
            data: {
              status: 'failed',
              meta_data: {
                ...(transaction.meta_data as object || {}),
                sagecloud_response: response.data,
                error: response.data.message || 'Transaction failed',
                failed_status: responseStatus,
              },
            },
          });

          // Refund the user
          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              current_balance: Number(wallet.current_balance), // Refund
            },
          });
        });

        this.logger.log(`User refunded for failed transaction: ${transaction.id}`);

        throw new BadRequestException(
          response.data.message || 'Airtime purchase failed. Amount has been refunded to your wallet.'
        );
      }
    } catch (error: any) {
      console.error(colors.red(`Error purchasing airtime from Sagecloud: ${error.message}`));
      
      if (error.response) {
        console.error(colors.red(`Sagecloud API error: ${JSON.stringify(error.response.data)}`));
        throw new HttpException(
          error.response.data?.message || 'Failed to purchase airtime',
          error.response.status || HttpStatus.BAD_REQUEST
        );
      }

      if (error instanceof BadRequestException || error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while processing your request',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get service code based on network
   */
  private getServiceCode(network: string): string {
    const networkUpper = network.toUpperCase();
    const serviceMap: Record<string, string> = {
      MTN: 'MTNVTU',
      GLO: 'GLOVTU',
      AIRTEL: 'AIRTELVTU',
      '9MOBILE': '9MOBILEVTU',
      ETISALAT: '9MOBILEVTU', // Alternative name
    };

    return serviceMap[networkUpper] || `${networkUpper}VTU`;
  }
}

