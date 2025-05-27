import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CreateTransferDto } from 'src/common/dto/banking.dto';
import { FlutterTransferResponse } from 'src/common/interfaces/banking.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { VerifyBvnDto } from './dto/flutterwave.dto';
import * as colors from 'colors';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';

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
      
          if (existingAccount.current_balance < dto.amount) {
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
                data: { current_balance: { decrement: dto.amount } },
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

    async createVirtualAcct(user: any): Promise<any> {
      console.log(colors.cyan("Creating new virtual account with Flutterwave..."));

      // console.log("user: ", user);

      const existingUser = await this.prisma.user.findUnique({
        where: {
          email: user.email
        },
        include: {
          kyc_verification: true
        }
      });

      // Check if users bvn is verified and also that users dosent already have an ngn account 
      try {

        const userBvnVerified = await this.prisma.user.findUnique({
          where: {
            email: user.email
          },
          select: {
            kyc_verification: true
          }
        });

        const existingngnAccount = await this.prisma.account.findFirst({
          where: {
            user_id: user.sub,
            currency: 'ngn',
          }
        });

        if (existingngnAccount) {
          console.log(colors.red("User already has an existing NGN account."));
          return new HttpException('User already has an existing NGN account', HttpStatus.BAD_REQUEST);
        }

        if (!userBvnVerified || !userBvnVerified.kyc_verification?.is_verified) {
          console.log(colors.red("User BVN is not verified. Cannot create virtual account."));

          throw new HttpException('BVN not verified', HttpStatus.BAD_REQUEST);
        }
        console.log(colors.green("User BVN is verified. Proceeding to create virtual account..."));
          
        } catch (error) {

          console.log(colors.red("Error checking user BVN verification: "), error);
          return new HttpException('Error checking user BVN verification', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Proceed to create virtual account with Flutterwave
          try {

            console.log("Existing user kyc: ", existingUser?.kyc_verification);

            const response  = await this.axiosInstance.post("/virtual-account-numbers", {
              bvn: existingUser?.kyc_verification?.bvn,
              email: existingUser?.email,
              is_permanent: true
            })

            console.log(colors.yellow("Flutterwave virtual account creation response: "), response.data.data);

            if (response.data.status === 'success') {
              // Save the virtual account details to the database
              const newAccount = await this.prisma.account.create({
                data: {
                  user_id: user.sub,
                  flw_response_code: response.data.data.response_code,
                  flw_response_message: response.data.data.message,
                  reference: response.data.data.flw_ref,
                  order_ref: response.data.data.order_ref,
                  account_number: response.data.data.account_number,
                  account_status: response.data.data.account_status,
                  frequency: response.data.data.frequency,
                  account_name: existingUser?.first_name + ' ' + existingUser?.last_name,
                  bank_name: response.data.data.bank_name,
                  balance_before: 0,
                  current_balance: 0,
                  balance_after: 0,
                  currency: 'ngn',
                },
              });

              const formattedData = {
                account_number: newAccount.account_number,
                account_name: newAccount.account_name,
                bank_name: newAccount.bank_name,
                current_balance: newAccount.current_balance,
              }

              return new ApiResponseDto(true, 'Account created successfully', formattedData);
            } else {
              console.log(colors.red("Virtual account creation failed: "), response.data.message);
              throw new HttpException(response.data.message || 'Virtual account creation failed', HttpStatus.BAD_REQUEST);
            }
            
          } catch (error) {

              console.error(colors.red("Error creating virtual account: "), error.response?.data);
              this.logger.error(`Error creating virtual account: ${error.message}`);
              
              if (error.response) {
                  throw new HttpException(
                      error.response.data?.message || 'Flutterwave API error',
                      error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
                  );
              }
              
              throw new HttpException('Virtual Account creation unavialble', HttpStatus.SERVICE_UNAVAILABLE);
            
          }
    }

      ///////////////////////////////////////////////////////             Verify BVN
      async verifyBvn(dto: VerifyBvnDto, user: any): Promise<any> {
        console.log(colors.cyan("Verifying BVN with Flutterwave..."));

        // console.log("user: ", user);

        const existingUser = await this.prisma.user.findUnique({
          where: {
            email: user.email
          },
          include: {
            kyc_verification: true
          }
        });

        if (!existingUser?.id) {
          throw new HttpException('User ID is missing. Cannot create KYC record.', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Check if user has not previously verified their BVN and it is not pending 
        if (existingUser?.kyc_verification?.is_verified) {
          console.log(colors.red("User BVN is already verified. Cannot verify again."));
          throw new HttpException('BVN already verified', HttpStatus.BAD_REQUEST);
        }

        console.log("kyc status: ", existingUser?.kyc_verification?.status);

        if (existingUser?.kyc_verification?.status === 'pending') {
          console.log(colors.red("Your BVN verification is already in progress"));
          return new ApiResponseDto(
            false, 
            'Your BVN verification is already in progress', 
            null
          )
        }

        try {
          const response  = await this.axiosInstance.post("/bvn/verifications", {
            bvn: dto.bvn,
            firstname: existingUser?.first_name,
            lastname: existingUser?.last_name,
            // redirect: this.configService.get<string>('FRONTEND_URL') + '/flutterwave/bvn-verification',
            callback_url: this.configService.get<string>('BACKEND_PRODUCTION_BASE_URL') + '/flutterwave/bvn-verify-webhook',
            email: user.email,
          })

          console.log(colors.yellow("Flutterwave BVN verification response: "), response.data);

          if (response.data.status === 'success') {

            // Save the BVN verification details to the database
            await this.prisma.kycVerification.create({
            data: {
              userId: existingUser.id!,
              id_no: dto.bvn,
              bvn: dto.bvn,
              bvn_verification_url: response.data.data.url,
              bvn_flw_reference: response.data.data.reference,
              status: 'pending',
              initiated_at: new Date(),
            },
          });
              
          console.log(colors.magenta("BVN verification initiated successfully."));
            return new ApiResponseDto(
              true, 
              'BVN verification awaiting approval', 
            )
          } else {
            console.log(colors.red("BVN verification failed: "), response.data.message);
            throw new HttpException(response.data.message || 'BVN verification failed', HttpStatus.BAD_REQUEST);
          }
          
        } catch (error) {

            console.error(colors.red("Error verifying BVN: "), error.response?.data);
            this.logger.error(`Error verifying BVN: ${error.message}`);
            
            if (error.response) {
                throw new HttpException(
                    error.response.data?.message || 'Flutterwave API error',
                    error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
                );
            }
            
            throw new HttpException('BVN verification service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
          
        }
      }

      ///////////////////////////////////////////////////////             Verify BVN webhook
      async verifyBvnWebhook(dto: any): Promise<any> {
        console.log(colors.cyan("Verifying BVN webhook with Flutterwave..."));

        try {

          console.log("Webhook data: ", dto);

          // Check if the webhook is for BVN verification
          if (dto.event !== 'bvn.completed') {
            console.log(colors.red("Invalid webhook event type. Expected 'bvn_verification'."));
            throw new HttpException('Invalid webhook event type', HttpStatus.BAD_REQUEST);
          }

          // Find the KYC record by the Flutterwave reference
          const kycRecord = await this.prisma.kycVerification.findFirst({
            where: {
              bvn_flw_reference: dto.data.reference,
            },
          });

          if (!kycRecord) {
            console.log(colors.red("KYC record not found for the provided reference."));
            throw new HttpException('KYC record not found', HttpStatus.NOT_FOUND);
          }

          // Update the KYC record based on the verification status
          const updatedKyc = await this.prisma.kycVerification.update({
          where: { id: kycRecord.id },
          data: {
            status: dto.data.status === 'COMPLETED' ? 'approved' : 'rejected',
            approved_at: dto.data.status === 'COMPLETED' ? new Date() : null,
            failure_reason: dto.data.status !== 'COMPLETED' ? dto.data.message : null,
            
            // Additional KYC fields from bvn_data
            first_name: dto.data.bvn_data.firstName?.trim(),
            last_name: dto.data.bvn_data.surname?.trim(),
            middle_name: dto.data.bvn_data.middleName?.trim() || null,
            phone: dto.data.bvn_data.phoneNumber1 || null,
            email: dto.data.bvn_data.email || null,
            date_of_birth: dto.data.bvn_data.dateOfBirth
              ? new Date(dto.data.bvn_data.dateOfBirth)
              : null,
            gender: dto.data.bvn_data.gender || null,
            nin: dto.data.bvn_data.nin || null,
            state_of_origin: dto.data.bvn_data.stateOfOrigin || null,
            lga_of_origin: dto.data.bvn_data.lgaOfOrigin || null,
            state_of_residence: dto.data.bvn_data.stateOfResidence || null,
            lga_of_residence: dto.data.bvn_data.lgaOfResidence || null,
            watchlisted: dto.data.bvn_data.watchlisted === '1.0' ? true : false,
            face_image: dto.data.bvn_data.faceImage || null,
          },
        });

          console.log(colors.green("BVN verification webhook processed successfully."), updatedKyc);

          return new ApiResponseDto(
            true, 
            'BVN verification processed successfully', 
            updatedKyc
          );
          
        } catch (error) {
          console.error(colors.red("Error verifying BVN webhook: "), error.response?.data);
          this.logger.error(`Error verifying BVN webhook: ${error.message}`);
          
          if (error.response) {
              throw new HttpException(
                  error.response.data?.message || 'Flutterwave API error',
                  error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
              );
          }
          
          throw new HttpException('BVN verification service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
          
        }
      }
}
