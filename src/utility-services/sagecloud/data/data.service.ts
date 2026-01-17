import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import axios from 'axios';
import { PurchaseDataDto } from './dto/purchase-data.dto';
import { SagecloudCredentialsHelper } from '../sagecloud-credentials.helper';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { formatAmount } from 'src/common/helper_functions/formatter';
import { generateUniqueTransactionReference } from 'src/common/helper_functions/generators';
import * as colors from 'colors';

@Injectable()
export class SagecloudDataService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Purchase data from Sagecloud
   * Note: This is a placeholder - update with actual Sagecloud data API endpoint when available
   */
  async purchaseData(dto: PurchaseDataDto, userPayload: any): Promise<ApiResponseDto<any>> {
    try {
      // 1. Validate credentials
      SagecloudCredentialsHelper.validateCredentials();
      const credentials = SagecloudCredentialsHelper.getCredentials();

      // 2. Get user and wallet
      const user = await this.prisma.user.findUnique({
        where: { email: userPayload.email },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const wallet = await this.prisma.wallet.findFirst({
        where: { user_id: user.id },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      // 3. Get data plan amount (you'll need to implement plan lookup)
      // For now, this is a placeholder - update based on Sagecloud data API
      const amount = await this.getDataPlanAmount(dto.network, dto.dataPlan);

      // 4. Validate sufficient balance
      if (Number(wallet.current_balance) < amount) {
        throw new BadRequestException(
          `Insufficient balance. You have ${formatAmount(wallet.current_balance)}, but trying to purchase ${formatAmount(amount)}`
        );
      }

      // 5. Generate reference if not provided
      const reference = dto.reference || await generateUniqueTransactionReference(this.prisma, 'sagecloud');

      // 6. Determine service code based on network
      const serviceCode = this.getDataServiceCode(dto.network);

      // 7. Create pending transaction
      const transaction = await this.prisma.transactionHistory.create({
        data: {
          user_id: user.id,
          amount: amount,
          transaction_type: 'data',
          credit_debit: 'debit',
          description: `Data purchase - ${dto.network} ${dto.phone}`,
          status: 'pending',
          payment_method: 'wallet',
          payment_channel: 'other', // Sagecloud is not in PaymentChannel enum, using 'other'
          transaction_reference: reference,
          balance_before: Number(wallet.current_balance),
          balance_after: Number(wallet.current_balance) - amount,
          recipient_mobile: dto.phone,
          meta_data: {
            network: dto.network,
            dataPlan: dto.dataPlan,
            service: serviceCode,
            provider: 'sagecloud',
          },
        },
      });

      // 8. Debit wallet
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          current_balance: Number(wallet.current_balance) - amount,
        },
      });

      // 9. Call Sagecloud API
      // TODO: Update endpoint when Sagecloud data API is available
      console.log(colors.cyan(`Calling Sagecloud API for data purchase: ${reference}`));
      
      // Placeholder - update with actual Sagecloud data endpoint
      const response = await axios.post(
        `${credentials.baseUrl}/v2/data`, // Update when endpoint is confirmed
        {
          reference: reference,
          network: dto.network,
          service: serviceCode,
          phone: dto.phone,
          plan: dto.dataPlan,
        },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${credentials.accessToken}`,
          },
          timeout: 30000,
        }
      );

      console.log(colors.green(`Sagecloud API response: ${JSON.stringify(response.data)}`));

      // 10. Update transaction based on response status
      const responseStatus = response.data.status?.toLowerCase() || '';
      const isSuccess = response.data.success && responseStatus === 'success';
      const isPending = responseStatus === 'pending' || responseStatus === 'processing' || responseStatus === 'in-progress';
      const isFailed = responseStatus === 'failed' || responseStatus === 'error' || (!response.data.success && !isPending);

      if (isSuccess) {
        // Transaction successful
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

        return new ApiResponseDto(
          true,
          response.data.message || 'Data purchase successful',
          {
            transaction_id: transaction.id,
            reference: response.data.reference || reference,
            amount: formatAmount(amount),
            network: dto.network,
            phone: dto.phone,
            dataPlan: dto.dataPlan,
            status: 'success',
            balance_after: formatAmount(Number(wallet.current_balance) - amount),
          }
        );
      } else if (isPending) {
        // Transaction is still processing - keep as pending, don't refund
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
          response.data.message || 'Data purchase is being processed. Please check status later.',
          {
            transaction_id: transaction.id,
            reference: response.data.reference || reference,
            amount: formatAmount(amount),
            network: dto.network,
            phone: dto.phone,
            dataPlan: dto.dataPlan,
            status: 'pending',
            processing: true,
            message: 'Transaction is being processed. Your wallet has been debited. Please check transaction status later.',
            balance_after: formatAmount(Number(wallet.current_balance) - amount),
          }
        );
      } else {
        // Transaction failed - refund user
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

        throw new BadRequestException(
          response.data.message || 'Data purchase failed. Amount has been refunded to your wallet.'
        );
      }
    } catch (error: any) {
      console.error(colors.red(`Error purchasing data from Sagecloud: ${error.message}`));
      
      if (error.response) {
        console.error(colors.red(`Sagecloud API error: ${JSON.stringify(error.response.data)}`));
        throw new HttpException(
          error.response.data?.message || 'Failed to purchase data',
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
   * Get data plan amount
   * TODO: Implement plan lookup from Sagecloud or database
   */
  private async getDataPlanAmount(network: string, dataPlan: string): Promise<number> {
    // Placeholder - implement actual plan lookup
    // This should query Sagecloud plans API or your database
    throw new BadRequestException('Data plan lookup not yet implemented. Please provide amount.');
  }

  /**
   * Get data service code based on network
   */
  private getDataServiceCode(network: string): string {
    const networkUpper = network.toUpperCase();
    const serviceMap: Record<string, string> = {
      MTN: 'MTNDATA',
      GLO: 'GLODATA',
      AIRTEL: 'AIRTELDATA',
      '9MOBILE': '9MOBILEDATA',
      ETISALAT: '9MOBILEDATA',
    };

    return serviceMap[networkUpper] || `${networkUpper}DATA`;
  }
}

