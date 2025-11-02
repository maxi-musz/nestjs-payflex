import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { CreatePaystackCustomerDto, AssignDvaDto } from './dto/dva.dto';

@Injectable()
export class PaystackService {
    private readonly logger = new Logger(PaystackService.name);
    private readonly paystackBaseUrl = 'https://api.paystack.co';
    private readonly paystackSecretKey: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
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

    private getHeaders() {
        return {
            'Authorization': `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Create or get a Paystack customer
     * If customer already exists on Paystack, returns existing customer
     */
    async createOrGetPaystackCustomer(userPayload: any) {
        this.logger.log(`Creating/Getting Paystack customer for user: ${userPayload.email}`);

        try {
            const existingUser = await this.prisma.user.findUnique({
                where: { id: userPayload.sub },
                include: { wallet: true }
            });

            if (!existingUser) {
                this.logger.error("User not found");
                throw new NotFoundException("User not found");
            }

            // Check if user already has a Paystack customer code stored
            const paystackCustomerCode = (existingUser as any).paystack_customer_code;

            if (paystackCustomerCode) {
                // Verify customer still exists on Paystack
                try {
                    const response = await axios.get(
                        `${this.paystackBaseUrl}/customer/${paystackCustomerCode}`,
                        { headers: this.getHeaders() }
                    );

                    if (response.data.status) {
                        this.logger.log("Existing Paystack customer found");
                        return new ApiResponseDto(true, "Customer retrieved successfully", response.data.data);
                    }
                } catch (error: any) {
                    // Customer doesn't exist on Paystack, create new one
                    this.logger.warn("Stored customer code invalid, creating new customer");
                }
            }

            // Create new customer on Paystack
            if (!existingUser.first_name || !existingUser.last_name || !existingUser.email || !existingUser.phone_number) {
                this.logger.error("User profile is incomplete", "User profile is incomplete. Please update your first name, last name, email, and phone number");
                throw new BadRequestException("User profile is incomplete. Please update your first name, last name, email, and phone number");
            }

            // Validate and format phone number
            // Check if phone_number is empty or just whitespace
            if (!existingUser.phone_number || !existingUser.phone_number.trim()) {
                this.logger.error(`Phone number is empty for user: ${existingUser.email}`);
                throw new BadRequestException("Phone number is required. Please update your phone number in your profile.");
            }

            let phoneNumber = existingUser.phone_number.trim();
            this.logger.log(`Phone number: ${phoneNumber}`);
            
            // Ensure phone number is in international format (+234...)
            if (!phoneNumber.startsWith('+')) {
                // If it starts with 0, replace with +234
                if (phoneNumber.startsWith('0')) {
                    phoneNumber = '+234' + phoneNumber.substring(1);
                }
                // If it starts with 234, add +
                else if (phoneNumber.startsWith('234')) {
                    phoneNumber = '+' + phoneNumber;
                }
                // Otherwise assume it's a Nigerian number
                else if (phoneNumber.length === 10 || phoneNumber.length === 11) {
                    // Remove leading 0 if present
                    const cleaned = phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber;
                    phoneNumber = '+234' + cleaned;
                }
            }

            // Validate phone number format
            if (!phoneNumber || phoneNumber.length < 10) {
                this.logger.error(`Invalid phone number format: ${existingUser.phone_number}`);
                throw new BadRequestException("Invalid phone number format. Please provide a valid phone number with country code (e.g., +2348012345678)");
            }

            this.logger.log(`Formatted phone number: ${phoneNumber} (original: ${existingUser.phone_number})`);

            const customerData = {
                email: existingUser.email,
                first_name: existingUser.first_name,
                last_name: existingUser.last_name,
                phone: phoneNumber,
                metadata: {
                    user_id: existingUser.id,
                }
            };

            this.logger.log(`Creating Paystack customer with data: ${JSON.stringify({ ...customerData, phone: phoneNumber })}`);

            const response = await axios.post(
                `${this.paystackBaseUrl}/customer`,
                customerData,
                { headers: this.getHeaders() }
            );

            if (!response.data.status) {
                const errorMessage = response.data.message || "Failed to create Paystack customer";
                this.logger.error(`Failed to create Paystack customer: ${errorMessage}`, JSON.stringify(response.data));
                
                // Handle specific Paystack errors
                if (errorMessage.toLowerCase().includes("phone") || errorMessage.toLowerCase().includes("phone number")) {
                    throw new HttpException(
                        `Phone number validation failed: ${errorMessage}. Please ensure your phone number is in international format (e.g., +2348012345678).`,
                        HttpStatus.BAD_REQUEST
                    );
                }
                
                throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
            }

            // Store Paystack customer code in user record
            await this.prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    // @ts-ignore - paystack_customer_code will be added to schema
                    paystack_customer_code: response.data.data.customer_code,
                }
            });

            this.logger.log("Paystack customer created successfully");
            return new ApiResponseDto(true, "Customer created successfully", response.data.data);

        } catch (error: any) {
            // Log full error details for debugging
            this.logger.error(`Error creating Paystack customer: ${error.message}`);
            
            // Log the full Paystack error response
            if (error.response) {
                this.logger.error(`Paystack API Error Response:`, JSON.stringify({
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data,
                }, null, 2));
            } else if (error.request) {
                this.logger.error(`Paystack API Request Error:`, JSON.stringify(error.request, null, 2));
            } else {
                this.logger.error(`Error details:`, JSON.stringify(error, null, 2));
            }
            
            if (error.response?.data) {
                // Handle Paystack API errors
                if (error.response.data.message?.includes("already exists")) {
                    // Customer already exists, try to fetch it
                    try {
                        const email = error.config?.data ? JSON.parse(error.config.data).email : (await this.prisma.user.findUnique({ where: { id: userPayload.sub } }))?.email;
                        const listResponse = await axios.get(
                            `${this.paystackBaseUrl}/customer?email=${encodeURIComponent(email || '')}`,
                            { headers: this.getHeaders() }
                        );

                        if (listResponse.data.status && listResponse.data.data?.length > 0) {
                            const customer = listResponse.data.data[0];
                            this.logger.log(`Retrieved existing customer: ${JSON.stringify(customer, null, 2)}`);
                            // Store the customer code
                            await this.prisma.user.update({
                                where: { id: userPayload.sub },
                                data: {
                                    // @ts-ignore
                                    paystack_customer_code: customer.customer_code,
                                }
                            });
                            return new ApiResponseDto(true, "Customer retrieved successfully", customer);
                        }
                    } catch (fetchError: any) {
                        this.logger.error(`Error fetching existing customer: ${fetchError.message}`);
                        if (fetchError.response?.data) {
                            this.logger.error(`Paystack fetch error: ${JSON.stringify(fetchError.response.data, null, 2)}`);
                        }
                    }
                }
                const paystackMessage = error.response.data.message || "Failed to create customer";
                throw new HttpException(paystackMessage, error.response.status || HttpStatus.BAD_REQUEST);
            }
            
            if (error instanceof HttpException || error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            
            this.logger.error("Failed to create Paystack customer", error.stack);
            throw new HttpException("Failed to create Paystack customer", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Assign a Dedicated Virtual Account (DVA) to a customer
     */
    async assignDedicatedVirtualAccount(userPayload: any, dto: AssignDvaDto) {
        this.logger.log("Assigning DVA to user", userPayload);
        
        this.logger.log(`Assigning DVA to user: ${userPayload.email}`);

        try {
            const existingUser = await this.prisma.user.findUnique({
                where: { id: userPayload.sub },
            });

            if (!existingUser) {
                this.logger.error("User not found", "No user found");
                throw new NotFoundException("User not found");
            }

            // Get or create Paystack customer first
            const customerResult = await this.createOrGetPaystackCustomer(userPayload);
            this.logger.log(`Customer data: ${JSON.stringify(customerResult.data, null, 2)}`);
            
            const customerCode = customerResult.data?.customer_code || (existingUser as any).paystack_customer_code;
            const paystackCustomer = customerResult.data;

            if (!customerCode) {
                this.logger.error("Unable to get Paystack customer code", "No customer code found");
                throw new BadRequestException("Unable to get Paystack customer code");
            }

            // Ensure customer has phone number - update if missing
            if (!paystackCustomer?.phone || !paystackCustomer?.phone_number) {
                this.logger.warn(`Customer ${customerCode} missing phone number, updating...`);
                
                // Format phone number
                let phoneNumber = existingUser.phone_number?.trim() || '';
                if (!phoneNumber.startsWith('+')) {
                    if (phoneNumber.startsWith('0')) {
                        phoneNumber = '+234' + phoneNumber.substring(1);
                    } else if (phoneNumber.startsWith('234')) {
                        phoneNumber = '+' + phoneNumber;
                    } else if (phoneNumber.length === 10 || phoneNumber.length === 11) {
                        const cleaned = phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber;
                        phoneNumber = '+234' + cleaned;
                    }
                }

                try {
                    const updateResponse = await axios.put(
                        `${this.paystackBaseUrl}/customer/${customerCode}`,
                        { phone: phoneNumber },
                        { headers: this.getHeaders() }
                    );

                    if (updateResponse.data.status) {
                        this.logger.log(`Customer phone number updated successfully: ${phoneNumber}`);
                    } else {
                        this.logger.warn(`Failed to update customer phone number: ${updateResponse.data.message}`);
                    }
                } catch (updateError: any) {
                    this.logger.error(`Error updating customer phone number: ${updateError.message}`);
                    if (updateError.response?.data) {
                        this.logger.error(`Paystack update error: ${JSON.stringify(updateError.response.data, null, 2)}`);
                    }
                    // Continue anyway - Paystack might still allow DVA assignment
                }
            }

            // Check if user already has an active DVA
            // Look for accounts with Paystack DVA metadata
            const existingDva = await this.prisma.account.findFirst({
                where: {
                    user_id: existingUser.id,
                    account_status: 'active',
                    isActive: true,
                },
            });
            this.logger.log(`Existing DVA found: ${existingDva}`);

            // Check if existing account is a Paystack DVA by checking metadata
            const isDva = existingDva && (existingDva.meta_data as any)?.provider === 'paystack';

            if (isDva && existingDva?.account_number) {
                this.logger.warn("User already has an active DVA");
                // Return existing DVA details
                return new ApiResponseDto(
                    true,
                    "User already has an active dedicated virtual account",
                    {
                        account_number: existingDva.account_number,
                        account_name: existingDva.account_name,
                        bank_name: existingDva.bank_name,
                        currency: existingDva.currency,
                        isActive: existingDva.isActive,
                    }
                );
            }

            // Assign DVA via Paystack API
            // In test mode, only paystack-titan is available
            // In production, both wema-bank and paystack-titan are available
            const isTestMode = process.env.NODE_ENV === 'development';
            const defaultBank = isTestMode ? 'paystack-titan' : 'wema-bank';
            
            const dvaData = {
                customer: customerCode,
                preferred_bank: dto.preferred_bank || defaultBank,
                country: dto.country || 'NG',
            };

            this.logger.log(`Assigning DVA with data: ${JSON.stringify(dvaData, null, 2)}`);
            this.logger.log(`Using Paystack base URL: ${this.paystackBaseUrl}`);
            this.logger.log(`Customer code: ${customerCode}`);

            const response = await axios.post(
                `${this.paystackBaseUrl}/dedicated_account`,
                dvaData,
                { headers: this.getHeaders() }
            );

            this.logger.log(`Paystack DVA assignment response: ${JSON.stringify(response.data, null, 2)}`);

            if (!response.data.status) {
                // Handle specific Paystack errors
                const errorMessage = response.data.message || "Failed to assign DVA";
                
                if (errorMessage.includes("Dedicated NUBAN is not available") || 
                    errorMessage.includes("not available for your business")) {
                    this.logger.error("DVA feature not enabled on Paystack account. Contact Paystack support to enable Dedicated Virtual Accounts.");
                    throw new HttpException(
                        "Dedicated Virtual Accounts are not enabled for your Paystack account. Please contact Paystack support to enable this feature.",
                        HttpStatus.BAD_REQUEST
                    );
                }
                
                if (errorMessage.includes("not available in test mode")) {
                    this.logger.error("Bank not available in test mode. Using paystack-titan for test mode.");
                    throw new HttpException(
                        "The selected bank is not available in test mode. Please use 'paystack-titan' or switch to production mode.",
                        HttpStatus.BAD_REQUEST
                    );
                }
                
                throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
            }

            const dvaInfo = response.data.data;

            // Store DVA in Account table
            const savedAccount = await this.prisma.account.create({
                data: {
                    user_id: existingUser.id,
                    account_number: dvaInfo.account_number,
                    account_name: dvaInfo.account_name || `${existingUser.first_name} ${existingUser.last_name}`,
                    bank_name: dvaInfo.bank?.name || dvaInfo.bank?.slug,
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

            return new ApiResponseDto(true, "Dedicated virtual account assigned successfully", {
                id: savedAccount.id,
                account_number: dvaInfo.account_number,
                account_name: dvaInfo.account_name,
                bank_name: dvaInfo.bank?.name,
                bank_slug: dvaInfo.bank?.slug,
                currency: 'NGN',
                isActive: true,
                createdAt: savedAccount.createdAt,
            });

        } catch (error: any) {
            // Log full error details for debugging
            this.logger.error(`Error assigning DVA: ${error.message}`);
            
            // Log the full Paystack error response
            if (error.response) {
                this.logger.error(`Paystack API Error Response:`, JSON.stringify({
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data,
                    headers: error.response.headers,
                }, null, 2));
            } else if (error.request) {
                this.logger.error(`Paystack API Request Error:`, JSON.stringify(error.request, null, 2));
            } else {
                this.logger.error(`Error details:`, JSON.stringify(error, null, 2));
            }
            
            // Handle 401 Unauthorized - API key issue
            if (error.response?.status === 401) {
                this.logger.error("Paystack API authentication failed. Check your PAYSTACK_TEST_SECRET_KEY or PAYSTACK_LIVE_SECRET_KEY environment variable.");
                throw new HttpException(
                    "Paystack API authentication failed. Please check your API key configuration.",
                    HttpStatus.UNAUTHORIZED
                );
            }
            
            // Handle specific Paystack error messages
            if (error.response?.data) {
                const paystackResponse = error.response.data;
                const paystackMessage = paystackResponse.message || paystackResponse.error || JSON.stringify(paystackResponse);
                
                this.logger.error(`Paystack error message: ${paystackMessage}`);
                
                if (paystackMessage.includes("Dedicated NUBAN is not available") || 
                    paystackMessage.includes("not available for your business")) {
                    throw new HttpException(
                        "Dedicated Virtual Accounts are not enabled for your Paystack account. Please contact Paystack support to enable this feature.",
                        HttpStatus.BAD_REQUEST
                    );
                }
                
                // Return the actual Paystack error message
                throw new HttpException(paystackMessage, error.response.status || HttpStatus.BAD_REQUEST);
            }
            
            if (error instanceof HttpException || error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            
            throw new HttpException("Failed to assign dedicated virtual account", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get user's dedicated virtual account
     */
    async getUserDedicatedVirtualAccount(userPayload: any) {
        this.logger.log(`Fetching DVA for user: ${userPayload.email}`);

        try {
            const existingUser = await this.prisma.user.findUnique({
                where: { id: userPayload.sub },
            });

            if (!existingUser) {
                throw new NotFoundException("User not found");
            }

            const dva = await this.prisma.account.findFirst({
                where: {
                    user_id: existingUser.id,
                    account_status: 'active',
                },
                orderBy: { createdAt: 'desc' },
            });

            if (!dva || !dva.account_number) {
                return new ApiResponseDto(false, "No dedicated virtual account found. Please assign one first.", null);
            }

            return new ApiResponseDto(true, "Dedicated virtual account retrieved successfully", {
                id: dva.id,
                account_number: dva.account_number,
                account_name: dva.account_name,
                bank_name: dva.bank_name,
                currency: dva.currency,
                isActive: dva.isActive,
                createdAt: dva.createdAt,
                updatedAt: dva.updatedAt,
            });

        } catch (error: any) {
            this.logger.error(`Error fetching DVA: ${error.message}`, error.stack);
            
            if (error instanceof NotFoundException) {
                throw error;
            }
            
            throw new HttpException("Failed to fetch dedicated virtual account", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * List all dedicated virtual accounts (for admin/debugging)
     */
    async listAllDedicatedVirtualAccounts() {
        this.logger.log("Fetching all dedicated virtual accounts");

        try {
            const response = await axios.get(
                `${this.paystackBaseUrl}/dedicated_account?active=true`,
                { headers: this.getHeaders() }
            );

            if (!response.data.status) {
                throw new HttpException(response.data.message || "Failed to fetch DVAs", HttpStatus.BAD_REQUEST);
            }

            return new ApiResponseDto(
                true,
                "Dedicated virtual accounts retrieved successfully",
                response.data.data
            );

        } catch (error: any) {
            this.logger.error(`Error listing DVAs: ${error.message}`, error.stack);
            
            if (error.response?.data) {
                throw new HttpException(error.response.data.message || "Failed to fetch DVAs", HttpStatus.BAD_REQUEST);
            }
            
            throw new HttpException("Failed to list dedicated virtual accounts", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Deactivate a dedicated virtual account
     */
    async deactivateDedicatedVirtualAccount(userPayload: any) {
        this.logger.log(`Deactivating DVA for user: ${userPayload.email}`);

        try {
            const existingUser = await this.prisma.user.findUnique({
                where: { id: userPayload.sub },
            });

            if (!existingUser) {
                throw new NotFoundException("User not found");
            }

            const dva = await this.prisma.account.findFirst({
                where: {
                    user_id: existingUser.id,
                    account_status: 'active',
                },
            });

            if (!dva) {
                throw new NotFoundException("No active dedicated virtual account found");
            }

            // Get Paystack DVA ID from metadata
            const paystackDvaId = (dva.meta_data as any)?.paystack_dva_id;

            if (paystackDvaId) {
                // Deactivate on Paystack
                try {
                    await axios.delete(
                        `${this.paystackBaseUrl}/dedicated_account/${paystackDvaId}`,
                        { headers: this.getHeaders() }
                    );
                } catch (error: any) {
                    this.logger.warn(`Paystack deactivation error: ${error.message}`);
                    // Continue with local deactivation even if Paystack call fails
                }
            }

            // Deactivate in database
            await this.prisma.account.update({
                where: { id: dva.id },
                data: {
                    isActive: false,
                    account_status: 'inactive',
                },
            });

            this.logger.log("DVA deactivated successfully");

            return new ApiResponseDto(true, "Dedicated virtual account deactivated successfully", null);

        } catch (error: any) {
            this.logger.error(`Error deactivating DVA: ${error.message}`, error.stack);
            
            if (error instanceof NotFoundException) {
                throw error;
            }
            
            throw new HttpException("Failed to deactivate dedicated virtual account", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
