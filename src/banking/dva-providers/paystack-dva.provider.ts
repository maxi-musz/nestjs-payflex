import { Injectable, Logger, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import axios from 'axios';
import { IDvaProvider, DvaAssignmentResult, DvaAssignmentOptions } from './dva-provider.interface';

/**
 * Paystack DVA Provider
 * Assigns dedicated virtual accounts using Paystack API
 * 
 * Setup:
 * - PAYSTACK_TEST_SECRET_KEY: For development
 * - PAYSTACK_LIVE_SECRET_KEY: For production
 */
@Injectable()
export class PaystackDvaProvider implements IDvaProvider {
  private readonly logger = new Logger(PaystackDvaProvider.name);
  private readonly paystackBaseUrl = 'https://api.paystack.co';
  private readonly paystackSecretKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Determine Paystack environment key
    this.paystackSecretKey = process.env.NODE_ENV === "development"
      ? process.env.PAYSTACK_TEST_SECRET_KEY || ''
      : process.env.PAYSTACK_LIVE_SECRET_KEY || '';
    
    // Validate API key is set
    if (!this.paystackSecretKey) {
      this.logger.warn('Paystack secret key is not configured. DVA features will not work.');
    }
  }

  getProviderName(): string {
    return 'Paystack';
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.paystackSecretKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create or get Paystack customer
   */
  private async createOrGetPaystackCustomer(userId: string, userEmail: string, phoneNumber?: string): Promise<string> {
    // Check if user already has a Paystack customer code
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { paystack_customer_code: true, phone_number: true },
    });

    if (user?.paystack_customer_code) {
      this.logger.log(`User already has Paystack customer code: ${user.paystack_customer_code}`);
      return user.paystack_customer_code;
    }

    // Format phone number
    let formattedPhone = phoneNumber || user?.phone_number || '';
    if (formattedPhone && !formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+234' + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith('234')) {
        formattedPhone = '+' + formattedPhone;
      } else if (formattedPhone.length === 10 || formattedPhone.length === 11) {
        const cleaned = formattedPhone.startsWith('0') ? formattedPhone.substring(1) : formattedPhone;
        formattedPhone = '+234' + cleaned;
      }
    }

    // Create customer in Paystack
    const customerData: any = {
      email: userEmail,
    };

    if (formattedPhone) {
      customerData.phone = formattedPhone;
    }

    try {
      const response = await axios.post(
        `${this.paystackBaseUrl}/customer`,
        customerData,
        { headers: this.getHeaders() }
      );

      if (response.data.status && response.data.data) {
        const customerCode = response.data.data.customer_code;
        
        // Check if this customer code already exists for another user
        const existingUser = await this.prisma.user.findUnique({
          where: { paystack_customer_code: customerCode },
          select: { id: true },
        });

        if (existingUser && existingUser.id !== userId) {
          this.logger.warn(
            `Paystack customer code ${customerCode} already exists for user ${existingUser.id}. This user: ${userId}`
          );
          // If customer code exists for another user, we can't use it
          // This shouldn't happen normally, but handle it gracefully
          throw new Error(`Customer code ${customerCode} already assigned to another user`);
        }
        
        // Save customer code to user (only if not already assigned to another user)
        try {
          await this.prisma.user.update({
            where: { id: userId },
            data: { paystack_customer_code: customerCode },
          });
        } catch (updateError: any) {
          // Handle race condition: if customer code was set between check and update
          if (updateError.code === 'P2002') {
            // Check if it was set for this user (race condition resolved itself)
            const currentUser = await this.prisma.user.findUnique({
              where: { id: userId },
              select: { paystack_customer_code: true },
            });
            
            if (currentUser?.paystack_customer_code === customerCode) {
              // It's already set for this user, that's fine
              this.logger.log(`Paystack customer code ${customerCode} already set for user ${userId}`);
              return customerCode;
            } else {
              // It was set for another user - this is a problem
              this.logger.error(
                `Race condition: Customer code ${customerCode} was set for another user during update`
              );
              throw new Error(`Customer code ${customerCode} conflict detected`);
            }
          }
          throw updateError;
        }

        this.logger.log(`Paystack customer created: ${customerCode}`);
        return customerCode;
      }

      throw new Error('Failed to create Paystack customer');
    } catch (error: any) {
      // Log full error details
      this.logger.error(`Error creating Paystack customer: ${error.message}`);
      
      if (error.response) {
        // Log the full Paystack error response
        // this.logger.error(`Paystack API Error Response:`, JSON.stringify({
        //   status: error.response.status,
        //   statusText: error.response.statusText,
        //   data: error.response.data,
        //   headers: error.response.headers,
        // }, null, 2));
        
        // Log the specific error message from Paystack
        if (error.response.data) {
          this.logger.error(`Paystack Error Message: ${error.response.data.message || JSON.stringify(error.response.data)}`);
        }
      } else if (error.request) {
        this.logger.error(`Paystack API Request Error:`, JSON.stringify(error.request, null, 2));
      } else {
        this.logger.error(`Error details:`, JSON.stringify(error, null, 2));
      }
      
      // If customer already exists, try to get it
      if (error.response?.data?.message?.includes('already exists')) {
        // Try to find customer by email
        try {
          const findResponse = await axios.get(
            `${this.paystackBaseUrl}/customer/${userEmail}`,
            { headers: this.getHeaders() }
          );

          if (findResponse.data.status && findResponse.data.data) {
            const customerCode = findResponse.data.data.customer_code;
            
            // Check if this customer code already exists for another user
            const existingUser = await this.prisma.user.findUnique({
              where: { paystack_customer_code: customerCode },
              select: { id: true },
            });

            if (existingUser && existingUser.id !== userId) {
              this.logger.warn(
                `Paystack customer code ${customerCode} already exists for user ${existingUser.id}. This user: ${userId}`
              );
              // If it exists for another user, check if current user already has it
              const currentUser = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { paystack_customer_code: true },
              });
              
              if (currentUser?.paystack_customer_code) {
                // User already has a customer code, use that instead
                this.logger.log(`User ${userId} already has customer code: ${currentUser.paystack_customer_code}`);
                return currentUser.paystack_customer_code;
              }
              
              // throw new Error(`Customer code ${customerCode} already assigned to another user`);
            }
            
            // Save customer code to user
            try {
              await this.prisma.user.update({
                where: { id: userId },
                data: { paystack_customer_code: customerCode },
              });
            } catch (updateError: any) {
              // Handle race condition
              if (updateError.code === 'P2002') {
                const currentUser = await this.prisma.user.findUnique({
                  where: { id: userId },
                  select: { paystack_customer_code: true },
                });
                
                if (currentUser?.paystack_customer_code === customerCode) {
                  this.logger.log(`Paystack customer code ${customerCode} already set for user ${userId}`);
                  return customerCode;
                }
                throw new Error(`Customer code ${customerCode} conflict detected`);
              }
              throw updateError;
            }
            
            return customerCode;
          }
        } catch (findError: any) {
          this.logger.error(`Error finding existing customer: ${findError.message}`);
          if (findError.response?.data) {
            this.logger.error(`Paystack Find Customer Error:`, JSON.stringify(findError.response.data, null, 2));
          }
        }
      }

      throw new HttpException(
        `Failed to create or retrieve Paystack customer: ${error.response?.data?.message || error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  async assignDva(
    userId: string,
    userEmail: string | null,
    options?: DvaAssignmentOptions,
  ): Promise<DvaAssignmentResult> {
    // Use email if available, otherwise use phone number as identifier
    const userIdentifier = userEmail || options?.phone_number || userId;
    this.logger.log(`Assigning DVA via Paystack for user: ${userIdentifier}`);

    try {
      // Get or create Paystack customer
      // Paystack requires an email, so use a fallback if email is null
      const emailForPaystack = userEmail || `${options?.phone_number?.replace('+', '') || userId}@smipay.temp`;
      const customerCode = await this.createOrGetPaystackCustomer(
        userId,
        emailForPaystack,
        options?.phone_number,
      );

      if (!customerCode) {
        throw new BadRequestException('Unable to get Paystack customer code');
      }

      // Check if user already has an active DVA
      const existingDva = await this.prisma.account.findFirst({
        where: {
          user_id: userId,
          account_status: 'active',
          isActive: true,
        },
      });

      // Check if existing account is a Paystack DVA
      if (existingDva && (existingDva.meta_data as any)?.provider === 'paystack' && existingDva.account_number) {
        this.logger.log('User already has an active Paystack DVA');
        return {
          success: true,
          account_number: existingDva.account_number,
          account_name: existingDva.account_name || '',
          bank_name: existingDva.bank_name || '',
          bank_slug: (existingDva.meta_data as any)?.bank_slug,
          currency: existingDva.currency || 'NGN',
        };
      }

      // Fetch user details for first_name and last_name (required by Paystack)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          first_name: true,
          last_name: true,
        },
      });

      // Paystack requires first_name and last_name
      const firstName = user?.first_name || options?.phone_number?.replace('+', '') || 'User';
      const lastName = user?.last_name || 'Account';

      // Determine preferred bank
      const isTestMode = process.env.NODE_ENV === 'development';
      const defaultBank = isTestMode ? 'paystack-titan' : 'wema-bank';
      
      const dvaData = {
        customer: customerCode,
        first_name: firstName,
        last_name: lastName,
        preferred_bank: options?.preferred_bank || defaultBank,
        country: options?.country || 'NG',
      };

      this.logger.log(`Assigning DVA with data: ${JSON.stringify(dvaData)}`);

      const response = await axios.post(
        `${this.paystackBaseUrl}/dedicated_account`,
        dvaData,
        { headers: this.getHeaders() }
      );

      if (!response.data.status) {
        const errorMessage = response.data.message || 'Failed to assign DVA';
        
        if (errorMessage.includes('Dedicated NUBAN is not available') || 
            errorMessage.includes('not available for your business')) {
          throw new HttpException(
            'Dedicated Virtual Accounts are not enabled for your Paystack account. Please contact Paystack support to enable this feature.',
            HttpStatus.BAD_REQUEST
          );
        }
        
        if (errorMessage.includes('not available in test mode')) {
          throw new HttpException(
            'The selected bank is not available in test mode. Please use \'paystack-titan\' or switch to production mode.',
            HttpStatus.BAD_REQUEST
          );
        }
        
        throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
      }

      const dvaInfo = response.data.data;

      // Store DVA in Account table
      await this.prisma.account.create({
        data: {
          user_id: userId,
          account_number: dvaInfo.account_number,
          account_name: dvaInfo.account_name || '',
          bank_name: dvaInfo.bank?.name || dvaInfo.bank?.slug || '',
          currency: 'ngn',
          accountType: 'savings',
          account_status: 'active',
          isActive: true,
          current_balance: 0,
          meta_data: {
            paystack_dva_id: dvaInfo.id,
            bank_slug: dvaInfo.bank?.slug,
            assigned_at: dvaInfo.assignment?.assigned_at,
            provider: 'paystack',
          },
        },
      });

      this.logger.log(`DVA assigned successfully: ${dvaInfo.account_number}`);

      return {
        success: true,
        account_number: dvaInfo.account_number,
        account_name: dvaInfo.account_name || '',
        bank_name: dvaInfo.bank?.name || dvaInfo.bank?.slug || '',
        bank_slug: dvaInfo.bank?.slug,
        currency: 'NGN',
        provider_response: response.data,
      };

    } catch (error: any) {
      // Log full error details
      // this.logger.error(`Error assigning DVA via Paystack: ${error.message}`);
      
      if (error.response) {
        // Log the full Paystack error response
        // this.logger.error(`Paystack DVA Assignment Error Response:`, JSON.stringify({
        //   status: error.response.status,
        //   statusText: error.response.statusText,
        //   data: error.response.data,
        //   headers: error.response.headers,
        // }, null, 2));
        
        // Log the specific error message from Paystack
        if (error.response.data) {
          this.logger.error(`Paystack DVA Error Message: ${error.response.data.message || JSON.stringify(error.response.data)}`);
        }
      } else if (error.request) {
        this.logger.error(`Paystack DVA API Request Error:`, JSON.stringify(error.request, null, 2));
      } else {
        this.logger.error(`DVA Assignment Error details:`, JSON.stringify(error, null, 2));
      }
      
      if (error.response?.status === 401) {
        throw new HttpException(
          'Paystack API authentication failed. Please check your API key configuration.',
          HttpStatus.UNAUTHORIZED
        );
      }
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to assign dedicated virtual account: ${error.response?.data?.message || error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

