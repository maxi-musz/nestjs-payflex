import { HttpException, HttpStatus, Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import * as colors from "colors";
import { ApiResponseDto } from "src/common/dto/api-response.dto";
import { KycVerificationDto, UpdateUserDto, VerifyBvnDto, SetupTransactionPinDto, UpdateTransactionPinDto, RequestAccountDeletionDto } from "./dto/user.dto";
import { formatAmount, formatDate } from "src/common/helper_functions/formatter";
import { first } from "rxjs";
import * as bcrypt from "bcrypt";
import { DvaProviderFactory } from "src/banking/dva-providers/dva-provider.factory";
import { StatsService } from "src/common/stats/stats.service";
import { CashbackService } from "src/common/cashback/cashback.service";
import { ReferralService } from "src/referral/referral.service";
import { FirstTxRewardService } from "src/common/first-tx-reward/first-tx-reward.service";
import { EmailService } from "src/common/mailer/email.service";
import { StorageService } from "src/storage/storage.service";

function maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) return "";
    const visibleDigits = 3;
    const maskedLength = Math.max(0, accountNumber.length - visibleDigits);
    return '*'.repeat(maskedLength) + accountNumber.slice(-visibleDigits);
}

 // Account Tier Configuration
 interface TierInfo {
    tier: string;
    name: string;
    description: string;
    requirements: string[];
    limits: {
        singleTransaction: number;
        daily: number;
        monthly: number;
        airtimeDaily: number;
    };
}

const ACCOUNT_TIERS: Record<string, TierInfo> = {
    UNVERIFIED: {
        tier: "UNVERIFIED",
        name: "Basic Tier",
        description: "Phone verified account with basic transaction limits",
        requirements: [
            "Phone number verification",
            "Email verification (optional)"
        ],
        limits: {
            singleTransaction: 50000,    // ₦50,000
            daily: 200000,                // ₦200,000
            monthly: 1000000,            // ₦1,000,000
            airtimeDaily: 20000           // ₦20,000
        }
    },
    VERIFIED: {
        tier: "VERIFIED",
        name: "Verified Tier",
        description: "KYC verified account with increased transaction limits",
        requirements: [
            "Phone number verification",
            "Email verification",
            "KYC verification (BVN/NIN)",
            "Face verification",
            "Address verification"
        ],
        limits: {
            singleTransaction: 100000,    // ₦100,000
            daily: 500000,                // ₦500,000
            monthly: 5000000,             // ₦5,000,000
            airtimeDaily: 50000           // ₦50,000
        }
    },
    PREMIUM: {
        tier: "PREMIUM",
        name: "Premium Tier",
        description: "Fully verified account with maximum transaction limits",
        requirements: [
            "Phone number verification",
            "Email verification",
            "KYC verification (BVN/NIN)",
            "Face verification",
            "Address verification",
            "BVN verification",
            "Additional documentation (if required)"
        ],
        limits: {
            singleTransaction: 500000,    // ₦500,000
            daily: 2000000,               // ₦2,000,000
            monthly: 10000000,            // ₦10,000,000
            airtimeDaily: 100000         // ₦100,000
        }
    }
};

/**
 * Determines user's current account tier based on verification status
 */
function getUserTier(user: any): TierInfo {
    const kycVerified = user?.kyc_verification?.is_verified === true;
    const bvnVerified = user?.kyc_verification?.bvn_verified === true;
    const phoneVerified = user?.is_phone_verified === true;
    const emailVerified = user?.is_email_verified === true;
    const hasAddress = !!user?.address;

    // Premium tier: All verifications complete including BVN
    if (kycVerified && bvnVerified && phoneVerified && emailVerified && hasAddress) {
        return ACCOUNT_TIERS.PREMIUM;
    }

    // Verified tier: KYC verified but may not have BVN
    if (kycVerified && phoneVerified && emailVerified && hasAddress) {
        return ACCOUNT_TIERS.VERIFIED;
    }

    // Unverified tier: Only phone or email verified
    return ACCOUNT_TIERS.UNVERIFIED;
}

 @Injectable()
 export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private dvaProviderFactory: DvaProviderFactory,
        private stats: StatsService,
        private cashbackService: CashbackService,
        private referralService: ReferralService,
        private firstTxRewardService: FirstTxRewardService,
        private emailService: EmailService,
        private storageService: StorageService,
    ) {}

    async fetchUserDashboard(userPayload: any) {

        console.log(colors.cyan("Fetching user dashboard..."))

        try {
            // find the user from the db using the supplied user email
            const existingUser = await this.prisma.user.findFirst({
                where: {email: userPayload.email},
                include: {
                    address: true,
                    profile_image: true,
                    wallet: true,
                    kyc_verification: true
                }
            })

            if(!existingUser) {
                console.log(colors.red("User not found"))
                throw new NotFoundException("User not found")
            }

            // Find all the transaction hisotires pertaining to the user
            const recentTransactions = await this.prisma.transactionHistory.findMany({
                where: { user_id: existingUser.id },
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                  sender_details: true,
                  icon: true
                }
              });

            // Get account balances grouped by currency
            const accounts = await this.prisma.account.findMany({
                where: { 
                    user_id: existingUser.id,
                    isActive: true
                 },
            });

            console.log(colors.magenta(`User dashboard successfully retrieved, Current balance: ${existingUser?.wallet?.current_balance}`))

            // Format the response
            return new ApiResponseDto(true, "Dashboard successfully retrieved", {
                user: {
                    id: existingUser.id,
                    name: `${existingUser.first_name} ${existingUser.last_name}`,
                    email: existingUser.email,
                    profileImage: existingUser.profile_image
                },
                wallet: {
                    id: existingUser.wallet?.id,
                    current_balance: existingUser?.wallet?.current_balance,
                    all_time_fuunding: existingUser?.wallet?.all_time_fuunding,
                    all_time_withdrawn: existingUser?.wallet?.all_time_withdrawn,
                    isActive: true,
                    createdAt: existingUser?.wallet?.createdAt,
                    updatedAt: existingUser?.wallet?.updatedAt,
                },
                kyc_verification: {
                    id: existingUser?.kyc_verification?.id || "",
                    is_verified: existingUser?.kyc_verification?.is_verified || false,
                    status: existingUser?.kyc_verification?.status || "",
                    id_type: existingUser?.kyc_verification?.id_type || "",
                    id_no: existingUser?.kyc_verification?.id_no || "",
                    bvn: existingUser?.kyc_verification?.bvn || "",
                    bvn_verified: existingUser?.kyc_verification?.bvn_verified || false,
                    watchlisted: existingUser?.kyc_verification?.watchlisted || false,
                    initiated_at: existingUser?.kyc_verification?.initiated_at || "",
                    approved_at: existingUser?.kyc_verification?.approved_at || "",
                    failure_reason: existingUser?.kyc_verification?.failure_reason || ""
                },
                transactionHistory: recentTransactions.map(tx => ({
                    id: tx.id,
                    amount: tx.amount,
                    type: tx.transaction_type,
                    description: tx.description,
                    status: tx.status,
                    date: tx.createdAt,
                    sender: tx.sender_details?.sender_name,
                    icon: tx.icon?.secure_url
                }))
            });

        } catch (error) {
            console.error(colors.red(`Dashboard fetch error: ${error.message}`));
            throw error; 
        }
    }

    async fetchUserWalletAndLatestTransaction(userPayload: any) {
        this.logger.log(colors.cyan("Fetching user data for app homepage..."));

        try {
            // Fetch user wallet details
            const userWallet = await this.prisma.wallet.findUnique({
                where: { user_id: userPayload.sub },
            })

            if(!userWallet) {
                this.logger.warn(colors.red("User wallet not found"))
                
                await this.prisma.wallet.create({
                    data: {
                        user_id: userPayload.sub,
                        current_balance: 0,
                        all_time_fuunding: 0,
                        all_time_withdrawn: 0,
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                })
                this.logger.log(colors.green("User wallet created successfully"))
            }

            // Fetch cashback wallet + active cashback rates (rates served from memory cache)
            const [cashbackWallet, cashbackRates] = await Promise.all([
                this.prisma.cashbackWallet.findUnique({ where: { user_id: userPayload.sub } }),
                this.cashbackService.getActiveRates(),
            ]);

            // Fetch user first name and display image 
            const user = await this.prisma.user.findUnique({
                where: { id: userPayload.sub },
                include: {
                    profile_image: true,
                    kyc_verification: true,
                    address: true,
                    tier: true,
                }
            })
            if(!user) {
                this.logger.error(colors.red("User not found"))
                throw new NotFoundException("User not found")
            } 

            // Check if user has a DVA, if not, auto-assign one
            const existingDva = await this.prisma.account.findFirst({
                where: {
                    user_id: userPayload.sub,
                    account_status: 'active',
                    isActive: true,
                },
            });

            // Check if existing account is a DVA (has provider in metadata)
           
            const [latest_transaction_history, accounts, referralConfig, cashbackConfig, firstTxConfig] = await Promise.all([
                this.prisma.transactionHistory.findMany({
                    where: { user_id: userPayload.sub },
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                    include: { sender_details: true, icon: true },
                }),
                this.prisma.account.findMany({
                    where: { user_id: userPayload.sub },
                }),
                this.prisma.referralConfig.findUnique({ where: { id: 'referral_config' } }),
                this.prisma.cashbackConfig.findUnique({ where: { id: 'cashback_config' } }),
                this.prisma.firstTxRewardConfig.findUnique({ where: { id: 'first_tx_reward_config' } }),
            ]);

            const createdCurrencies = new Set(accounts.map(account => account.currency));

            // ── Build reward banners for homepage carousel ──
            const reward_banners: { type: string; title: string; message: string; data?: Record<string, any> }[] = [];

            if (referralConfig?.is_active) {
                reward_banners.push({
                    type: 'referral',
                    title: 'Refer & Earn 🎁',
                    message: `Invite a friend and earn ₦${formatAmount(referralConfig.referrer_reward_amount)} when they make their first transaction! Your friend gets ₦${formatAmount(referralConfig.referee_reward_amount)} too.`,
                    data: {
                        referrer_reward: referralConfig.referrer_reward_amount,
                        referee_reward: referralConfig.referee_reward_amount,
                    },
                });
            }

            if (cashbackConfig?.is_active) {
                reward_banners.push({
                    type: 'cashback',
                    title: 'Cashback is Live 💰',
                    message: `Earn cashback on every purchase you make on SmiPay — airtime, data, bills and more. The more you transact, the more you earn!`,
                    data: {
                        max_per_transaction: cashbackConfig.max_cashback_per_transaction,
                        max_per_day: cashbackConfig.max_cashback_per_day,
                    },
                });
            }

            // Only show first-tx banner if user has not been rewarded yet (single source of truth: user.first_tx_reward_received)
            if (firstTxConfig?.is_active && !user.first_tx_reward_received) {
                const now = new Date();
                const withinWindow =
                    (!firstTxConfig.start_date || now >= firstTxConfig.start_date) &&
                    (!firstTxConfig.end_date || now <= firstTxConfig.end_date);

                if (withinWindow) {
                    reward_banners.push({
                        type: 'first_transaction',
                        title: 'Welcome Bonus 🎉',
                        message: `Fund your acccount, Make your first transaction and earn ₦${formatAmount(firstTxConfig.reward_amount)} instantly.`,
                        data: {
                            reward_amount: firstTxConfig.reward_amount,
                            min_transaction_amount: firstTxConfig.min_transaction_amount,
                        },
                    });
                }
            }

            const formattedResponse = {
                user: {
                    id: userPayload.sub,
                    smipay_tag: user.smipay_tag || "",
                    name: `${user.first_name} ${user.last_name}`,
                    isTransactionPinSetup: !!user.transactionPinHash,
                    phone_number: user.phone_number || "",
                    first_name: user.first_name || "",
                    last_name: user.last_name || "",
                    email: user.email || "",
                    role: user.role || "",
                    first_tx_reward_received: user.first_tx_reward_received || false,
                    profile_image: user.profile_image?.secure_url || "",
                    is_email_verified: user.is_email_verified || false,
                    requested_account_deletion: user.requested_account_deletion ?? false,
                },

                accounts: accounts.map(account => ({
                    id: account.id,
                    account_holder_name: account.account_name,
                    account_number: account.account_number ?? "",
                    bank_name: account.bank_name,
                    currency: account.currency,
                    balance: formatAmount(account.current_balance),
                    isActive: account.isActive,
                    createdAt: formatDate(account.createdAt),
                    updatedAt: formatDate(account.updatedAt)
                })),

                wallet_card: {
                    id: userWallet?.id,
                    current_balance: formatAmount(userWallet?.current_balance ?? 0),
                    all_time_fuunding: formatAmount(userWallet?.all_time_fuunding ?? 0),
                    all_time_withdrawn: formatAmount(userWallet?.all_time_withdrawn ?? 0),
                    owned_currencies: Array.from(createdCurrencies),
                    isActive: userWallet?.isActive,
                    createdAt: userWallet?.createdAt,
                    updatedAt: formatDate(userWallet?.updatedAt ?? new Date()),
                },
                cashback_wallet: {
                    current_balance: formatAmount(cashbackWallet?.current_balance ?? 0),
                    all_time_earned: formatAmount(cashbackWallet?.all_time_earned ?? 0),
                    all_time_withdrawn: formatAmount(cashbackWallet?.all_time_withdrawn ?? 0),
                },
                cashback_rates: cashbackRates,
                transaction_history: latest_transaction_history.map(tx => ({
                    id: tx.id,
                    amount: tx.amount,
                    type: tx.transaction_type,
                    provider: tx.provider,
                    description: tx.description,
                    credit_debit: tx.credit_debit,
                    status: tx.status,
                    date: formatDate(tx.createdAt),
                    sender: tx.sender_details?.sender_name,
                    icon: tx.icon?.secure_url
                })),
                kyc_verification: {
                    id: user?.kyc_verification?.id || "",
                    is_verified: user?.kyc_verification?.is_verified || false,
                    status: user?.kyc_verification?.status || "",
                    id_type: user?.kyc_verification?.id_type || "",
                    id_no: user?.kyc_verification?.id_no || "",
                    bvn: user?.kyc_verification?.bvn || "",
                    bvn_verified: user?.kyc_verification?.bvn_verified || false,
                    watchlisted: user?.kyc_verification?.watchlisted || false,
                    initiated_at: user?.kyc_verification?.initiated_at || "",
                    approved_at: user?.kyc_verification?.approved_at || "",
                    failure_reason: user?.kyc_verification?.failure_reason || ""
                },
                current_tier: (() => {
                    // If user has a tier assigned in database, use that
                    if (user?.tier) {
                        this.logger.log(colors.cyan("User has a tier assigned in database, using that..."))
                        return {
                            tier: user.tier.tier,
                            name: user.tier.name,
                            description: user.tier.description || "",
                            requirements: (user.tier.requirements as string[]) || [],
                            limits: {
                                singleTransaction: user.tier.single_transaction_limit,
                                daily: user.tier.daily_limit,
                                monthly: user.tier.monthly_limit,
                                airtimeDaily: user.tier.airtime_daily_limit,
                            },
                            is_active: user.tier.is_active,
                        };
                    }
                    
                    // Otherwise, determine tier based on verification status
                    this.logger.log(colors.cyan("Determining user tier based on verification status..."))
                    const determinedTier = getUserTier(user);
                    return {
                        tier: determinedTier.tier,
                        name: determinedTier.name,
                        description: determinedTier.description,
                        requirements: determinedTier.requirements,
                        limits: determinedTier.limits,
                        is_active: true,
                    };
                })(),
                reward_banners,
            }
            console.log(colors.magenta(`User data for ${user.email} for app homepage successfully retrieved`))
            // console.log(colors.magenta(`User data for ${user.email} for app homepage successfully retrieved: ${JSON.stringify(formattedResponse, null, 2)}`))
            return new ApiResponseDto(
                true, 
                `User data ${user.email} for app homepage successfully retrieved`, 
                formattedResponse
            )
            
        } catch (error) {
            console.log(colors.red(`Error fetching user app details: ${error.message}`))
            throw new HttpException(
                error.response?.data?.message || "Error fetching user app details",
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
                { cause: new Error() }
            )
        }
    }

    // App Fetch for profile page
    async fetchUserProfileForApp(userPayload: any) {
        this.logger.log(colors.cyan(`Fetching current user profile for app: ${userPayload.phone_number}`));

        try {
            // fetch user from db using phone_number (unique identifier)
            const fullUserDetails = await this.prisma.user.findFirst({
                where: {phone_number: userPayload.phone_number},
                include: {
                    profile_image: true,
                    address: true,
                    kyc_verification: true,
                    cards: true,
                    wallet: true,
                    accounts: true,
                    tier: true,
                }
            })

            // console.log("Kyc verification details: ", fullUserDetails?.kyc_verification)

            // console.log(colors.magenta(`User profile data retrieved successfully for: ${fullUserDetails?.email}`))

            const userId = fullUserDetails?.id;

            const [availableTiers, referralAnalysis] = await Promise.all([
                this.getAvailableTiers(fullUserDetails?.tier_id),
                userId ? this.getReferralAnalysisForUser(userId) : null,
            ]);

            const referralConfig = referralAnalysis?.config;

            // Format the response
            const formattedResponse = {
                user: {
                    id: userPayload.sub,
                    name: `${fullUserDetails?.first_name} ${fullUserDetails?.last_name}`,
                    first_name: fullUserDetails?.first_name,
                    last_name: fullUserDetails?.last_name,
                    email: fullUserDetails?.email,
                    is_verified: fullUserDetails?.is_email_verified,
                    phone_number: fullUserDetails?.phone_number || null,
                    profile_image: fullUserDetails?.profile_image?.secure_url || "",
                    gender: fullUserDetails?.gender || "",
                    date_of_birth: fullUserDetails?.date_of_birth || "",
                    joined: fullUserDetails?.createdAt ? formatDate(fullUserDetails.createdAt) : "N/A",
                    totalCards: fullUserDetails?.cards?.length || 0,
                    totalAccounts: fullUserDetails?.accounts?.length || 0,
                    wallet_balance: fullUserDetails?.wallet?.current_balance || 0,
                    referral_code: fullUserDetails?.referral_code || fullUserDetails?.smipay_tag || "",
                    smipay_tag: fullUserDetails?.smipay_tag || "",
                    requested_account_deletion: fullUserDetails?.requested_account_deletion ?? false,
                },

                address: {
                    id: fullUserDetails?.address?.id,
                    house_no: fullUserDetails?.address?.house_number,
                    city: fullUserDetails?.address?.city,
                    state: fullUserDetails?.address?.state,
                    country: fullUserDetails?.address?.country,
                    house_address: fullUserDetails?.address?.home_address,
                    postal_code: fullUserDetails?.address?.postal_code
                },

                kyc_verification: {
                    id: fullUserDetails?.kyc_verification?.id || "",
                    is_active: fullUserDetails?.kyc_verification?.is_verified || "",
                    status: fullUserDetails?.kyc_verification?.status || "",
                    id_type: fullUserDetails?.kyc_verification?.id_type || "",
                    id_number: fullUserDetails?.kyc_verification?.id_no || "",
                },

                wallet_card: {
                    id: fullUserDetails?.wallet?.id,
                    current_balance: formatAmount(fullUserDetails?.wallet?.current_balance || 0),
                    all_time_fuunding: formatAmount(fullUserDetails?.wallet?.all_time_fuunding || 0),
                    all_time_withdrawn: formatAmount(fullUserDetails?.wallet?.all_time_withdrawn || 0),
                    isActive: fullUserDetails?.wallet?.isActive,
                    createdAt: fullUserDetails?.wallet?.createdAt,
                    updatedAt: formatDate(fullUserDetails?.wallet?.updatedAt ?? new Date()),
                },

                current_tier: fullUserDetails?.tier ? {
                    tier: fullUserDetails.tier.tier,
                    name: fullUserDetails.tier.name,
                    description: fullUserDetails.tier.description || "",
                    requirements: (fullUserDetails.tier.requirements as string[]) || [],
                    limits: {
                        singleTransaction: fullUserDetails.tier.single_transaction_limit,
                        daily: fullUserDetails.tier.daily_limit,
                        monthly: fullUserDetails.tier.monthly_limit,
                        airtimeDaily: fullUserDetails.tier.airtime_daily_limit,
                    },
                    is_active: fullUserDetails.tier.is_active,
                } : null,

                available_tiers: availableTiers,

                referral_analysis: referralAnalysis
                    ? {
                          total_referred: referralAnalysis.total_referred,
                          by_status: referralAnalysis.by_status,
                          referrer_rewards_issued: referralAnalysis.referrer_rewards_issued,
                          referrer_rewards_total_amount: referralAnalysis.referrer_rewards_total_amount,
                          referee_rewards_issued: referralAnalysis.referee_rewards_issued,
                          referee_rewards_total_amount: referralAnalysis.referee_rewards_total_amount,
                          slots_remaining: referralAnalysis.slots_remaining,
                          program_config: referralConfig
                              ? {
                                    is_active: referralConfig.is_active,
                                    referrer_reward_amount: referralConfig.referrer_reward_amount,
                                    referee_reward_amount: referralConfig.referee_reward_amount,
                                    reward_trigger: referralConfig.reward_trigger,
                                    max_referrals_per_user: referralConfig.max_referrals_per_user,
                                    min_transaction_amount: referralConfig.min_transaction_amount,
                                }
                              : null,
                      }
                    : null,
            }

            return new ApiResponseDto(
                true,
                "User profile successfully fetched",
                formattedResponse
            )
            
        } catch (error) {
            console.log(colors.red(`Error fetching user details: ${error}`))
            throw new HttpException("Error fetching user details", HttpStatus.SERVICE_UNAVAILABLE, {cause: new Error()})   
        }
    }

    private async getAvailableTiers(currentTierId?: string | null) {
        const tiers = await this.prisma.tier.findMany({
            where: { is_active: true },
            orderBy: { order: 'asc' },
        });

        return tiers.map(t => ({
            id: t.id,
            tier: t.tier,
            name: t.name,
            description: t.description || "",
            order: t.order,
            requirements: (t.requirements as string[]) || [],
            limits: {
                singleTransaction: t.single_transaction_limit,
                daily: t.daily_limit,
                monthly: t.monthly_limit,
                airtimeDaily: t.airtime_daily_limit,
            },
            is_current: t.id === currentTierId,
        }));
    }

    private async getReferralAnalysisForUser(userId: string) {
        const [config, statusGroups, referrerRewards, refereeRewards] = await Promise.all([
            this.prisma.referralConfig.findUnique({ where: { id: 'referral_config' } }),
            this.prisma.referral.groupBy({
                by: ['status'],
                where: { referrer_id: userId },
                _count: { id: true },
            }),
            this.prisma.referral.aggregate({
                where: { referrer_id: userId, referrer_reward_given: true },
                _count: { id: true },
                _sum: { referrer_reward_amount: true },
            }),
            this.prisma.referral.aggregate({
                where: { referrer_id: userId, referee_reward_given: true },
                _count: { id: true },
                _sum: { referee_reward_amount: true },
            }),
        ]);

        const by_status: Record<string, number> = {
            pending: 0,
            eligible: 0,
            rewarded: 0,
            partially_rewarded: 0,
            expired: 0,
            rejected: 0,
        };
        let total_referred = 0;
        for (const g of statusGroups) {
            by_status[g.status] = g._count.id;
            total_referred += g._count.id;
        }

        const maxReferrals = config?.max_referrals_per_user ?? 50;
        const slots_remaining = Math.max(0, maxReferrals - total_referred);

        return {
            total_referred,
            by_status,
            referrer_rewards_issued: referrerRewards._count.id,
            referrer_rewards_total_amount: referrerRewards._sum.referrer_reward_amount ?? 0,
            referee_rewards_issued: refereeRewards._count.id,
            referee_rewards_total_amount: refereeRewards._sum.referee_reward_amount ?? 0,
            slots_remaining,
            config: config ?? null,
        };
    }

    async fetchUserProfile(userPayload: any) {
        console.log(colors.cyan(`Fetching current user profile: ${userPayload.email}`))

        try {

            // fetch user from db
            const fullUserDetails = await this.prisma.user.findUnique({
                where: {email: userPayload.email},
                include: {
                    profile_image: true,
                    address: true,
                    kyc_verification: true
                }
            })

            console.log(colors.magenta(`User profile data retrieved successfully for: ${fullUserDetails?.email}`))

            const formattedUserProfile = {
                id: fullUserDetails?.id || "",
                first_name: fullUserDetails?.first_name || "",
                middle_name: fullUserDetails?.middle_name || "",
                last_name: fullUserDetails?.last_name || "",
                email: fullUserDetails?.email || "",
                phone_number: fullUserDetails?.phone_number || "",
                smipay_tag: fullUserDetails?.smipay_tag || "",
                gender: fullUserDetails?.gender || "",
                role: fullUserDetails?.role || "",
                date_of_birth: fullUserDetails?.date_of_birth || "",
                email_verification: fullUserDetails?.is_email_verified || false,
                phone_verification: fullUserDetails?.is_phone_verified || false,
                is_friendly: fullUserDetails?.is_friendly || false,
                referral_code: fullUserDetails?.referral_code || "",
                account_status: fullUserDetails?.account_status || "",
                agree_to_terms: fullUserDetails?.agree_to_terms || false,
                updates_opt_in: fullUserDetails?.updates_opt_in || false,
                profile_image: fullUserDetails?.profile_image?.secure_url || "",
                joined: fullUserDetails?.createdAt ? formatDate(fullUserDetails.createdAt) : "N/A",
                updated_at: fullUserDetails?.updatedAt ? formatDate(fullUserDetails.updatedAt) : "N/A",
            }
            // console.log("Formatted user profile: ", formattedUserProfile)

            const address = {
                id: fullUserDetails?.address?.id || null,
                house_no: fullUserDetails?.address?.house_number || null,
                city: fullUserDetails?.address?.city || null,
                state: fullUserDetails?.address?.state || null,
                country: fullUserDetails?.address?.country || null,
                house_address: fullUserDetails?.address?.home_address || null,
                postal_code: fullUserDetails?.address?.postal_code || null
            }

            const user_kyc = {
                id: fullUserDetails?.kyc_verification?.id || "",
                user_id: fullUserDetails?.kyc_verification?.userId || "",
                is_verified: fullUserDetails?.kyc_verification?.is_verified || false,
                status: fullUserDetails?.kyc_verification?.status || "",
                id_type: fullUserDetails?.kyc_verification?.id_type || "",
                id_number: fullUserDetails?.kyc_verification?.id_no || "",
                bvn: fullUserDetails?.kyc_verification?.bvn || "",
                bvn_verified: fullUserDetails?.kyc_verification?.bvn_verified || false,
                watchlisted: fullUserDetails?.kyc_verification?.watchlisted || false,
                initiated_at: fullUserDetails?.kyc_verification?.initiated_at ? formatDate(fullUserDetails.kyc_verification.initiated_at) : "",
                approved_at: fullUserDetails?.kyc_verification?.approved_at ? formatDate(fullUserDetails.kyc_verification.approved_at) : "",
                failure_reason: fullUserDetails?.kyc_verification?.failure_reason || "",
            }

            // Get user's current tier
            const currentTier = getUserTier(fullUserDetails);

            // Format all available tiers for response
            const availableTiers = Object.values(ACCOUNT_TIERS).map(tier => ({
                tier: tier.tier,
                name: tier.name,
                description: tier.description,
                requirements: tier.requirements,
                limits: tier.limits,
                is_current: tier.tier === currentTier.tier
            }));

            return new ApiResponseDto(
                true,
                "User profile successfully fetched",
                {
                    profile_data: formattedUserProfile,
                    address: address,
                    user_kyc_data: user_kyc,
                    account_tier: {
                        current_tier: {
                            tier: currentTier.tier,
                            name: currentTier.name,
                            description: currentTier.description,
                            requirements: currentTier.requirements,
                            limits: currentTier.limits
                        },
                        available_tiers: availableTiers
                    }
                }
            )
            
        } catch (error) {
            console.log(colors.red(`Error fetching user details: ${error}`))
            return new ApiResponseDto(
                false,
                "Error fetching user details",
                { error: error.message }
            )
        }
    }

    async verifyBvn(dto: VerifyBvnDto) {
        console.log(colors.cyan("Verifying BVN..."))

        try {

            const verifyEndpoint = "https://api.flutterwave.com/v3/bvn/verifications";
            const verifyBvnReqBody = {
                bvn: dto.bvn,
                first_name: dto.first_name,
                last_name: dto.last_name,
                redirect_url: "http://localhost:3000/profile",
            };
    
            // Add logic to send the request to the verifyEndpoint here
    
        } catch (error) {
            console.error(colors.red(`BVN verification error: ${error.message}`));
            throw new HttpException(
                error.response?.data?.message || 'BVN verification failed',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async fetchUserKYC(userPayload: any) {
        console.log(colors.cyan("Fetching user KYC..."))

        try {
            // find the user from the db using the supplied user email
            const existingUser = await this.prisma.user.findFirst({
                where: {email: userPayload.email},
                include: {
                    address: true,
                    profile_image: true,
                    kyc_verification: true
                }
            })

            if(!existingUser) {
                console.log(colors.red("User not found"))
                throw new NotFoundException("User not found")
            }

            console.log(colors.magenta("User KYC successfully retrieved"))

            return new ApiResponseDto(true, "KYC successfully retrieved", {
                id: existingUser.id,
                first_name: existingUser.first_name,
                last_name: existingUser.last_name,
                email: existingUser.email,
                phone_number: existingUser.phone_number,
                address: existingUser.address?.home_address,
                city: existingUser.address?.city,
                state: existingUser.address?.state,
                country: existingUser.address?.country,
                profile_image: existingUser.profile_image,
                kyc_verification: existingUser.kyc_verification
            });

        } catch (error) {
            console.error(colors.red(`KYC fetch error: ${error.message}`));
            throw error; 
        }
    }

    async updateUserProfile(dto: UpdateUserDto, userPayload: any) {
        console.log(colors.cyan("Updating user KYC..."))
    
        try {
            // get user from db
            const existingUser = await this.prisma.user.findUnique({
                where: { id: userPayload.sub },
                include: {
                    address: true,
                    profile_image: true
                }
            })
    
            if(!existingUser) {
                console.log(colors.red("User not found"))
                throw new NotFoundException("User not found")
            }
    
            // Create an object with only the provided fields
            const userUpdateData: any = {};
            
            // Handle user fields
            if(dto.first_name) userUpdateData.first_name = dto.first_name;
            if(dto.last_name) userUpdateData.last_name = dto.last_name;
            if(dto.email) userUpdateData.email = dto.email;
            
            // Handle address fields if any were provided
            const addressFields = ['home_address', 'city', 'state', 'country', 'postal_code', 'house_number'];
            const hasAddressUpdates = addressFields.some(field => dto[field] !== undefined);
            
            if (hasAddressUpdates) {
                userUpdateData.address = {
                    update: {}
                };
                
                addressFields.forEach(field => {
                    if (dto[field] !== undefined) {
                        userUpdateData.address.update[field] = dto[field];
                    }
                });
            }
    
            // Only update if there's something to update
            if (Object.keys(userUpdateData).length === 0) {
                console.log(colors.yellow("No fields to update"));
                return new ApiResponseDto(
                    true, "No fields to update", 
                    { user: existingUser }
                );
            }
    
            // update the user 
            const updatedUser = await this.prisma.user.update({
                where: { id: existingUser.id },
                data: userUpdateData,
                include: {
                    address: true,
                    profile_image: true
                }
            });
    
            console.log(colors.magenta("User information successfully updated"))
            return new ApiResponseDto(
                true, "User information successfully updated", 
                {
                    id: updatedUser.id,
                    first_name: updatedUser.first_name,
                    last_name: updatedUser.last_name,
                    email: updatedUser.email,
                    phone_number: updatedUser.phone_number,
                    gender: updatedUser.gender,
                    date_of_birth: updatedUser.date_of_birth,
                    is_email_verified: updatedUser.is_email_verified,
                    createdAt: updatedUser.createdAt,
                    address: {
                         id: updatedUser.address?.id,
                         city: updatedUser.address?.city,
                         state: updatedUser.address?.state,
                         country: updatedUser.address?.country,
                         home_address: updatedUser.address?.home_address,
                         postal_code: updatedUser.address?.postal_code,
                         house_number: updatedUser.address?.house_number,
                    },
                    profile_image: {
                        secure_url: updatedUser.profile_image?.secure_url,
                        public_id: updatedUser.profile_image?.public_id,
                        }
                }
            );
        } catch (error) {
            console.error(colors.red(`User information update error: ${error.message}`));
            throw new HttpException(
                error.response?.data?.message || 'User information update failed',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            ); 
        }
    }

    private static readonly DISPLAY_PICTURE_MAX_BYTES = 5 * 1024 * 1024;
    private static readonly DISPLAY_PICTURE_MIMES = new Set([
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
    ]);

    async updateDisplayPicture(file: Express.Multer.File | undefined, userPayload: any) {
        if (!file?.buffer?.length) {
            throw new BadRequestException(
                'Image file is required. Send multipart field name: file',
            );
        }
        if (!UserService.DISPLAY_PICTURE_MIMES.has(file.mimetype)) {
            throw new BadRequestException(
                "Only JPEG, PNG, GIF, or WebP images are allowed",
            );
        }
        if (file.size > UserService.DISPLAY_PICTURE_MAX_BYTES) {
            throw new BadRequestException("Image must be 5MB or smaller");
        }

        const userId = userPayload.sub;
        const existingUser = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile_image: true },
        });

        if (!existingUser) {
            throw new NotFoundException("User not found");
        }

        const oldPublicId = existingUser.profile_image?.public_id ?? null;

        let uploaded;
        try {
            uploaded = await this.storageService.upload(file, {
                folder: "smipay/profile-images",
                resource_type: "image",
                allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
            });
        } catch (err: any) {
            this.logger.error(`Display picture upload failed: ${err?.message}`);
            throw new BadRequestException("Failed to upload image");
        }

        const profileImage = await this.prisma.profileImage.upsert({
            where: { userId },
            create: {
                userId,
                secure_url: uploaded.secure_url,
                public_id: uploaded.public_id,
            },
            update: {
                secure_url: uploaded.secure_url,
                public_id: uploaded.public_id,
            },
        });

        if (oldPublicId && oldPublicId !== uploaded.public_id) {
            try {
                await this.storageService.delete(oldPublicId);
            } catch (err: any) {
                this.logger.warn(
                    `Could not delete previous profile image from storage: ${err?.message}`,
                );
            }
        }

        return new ApiResponseDto(true, "Display picture updated successfully", {
            profile_image: {
                secure_url: profileImage.secure_url,
                public_id: profileImage.public_id,
                storage_provider: uploaded.provider,
            },
        });
    }

    async UpdateKyc(dto: KycVerificationDto, userPayload: any) {
        console.log(colors.cyan("Updating user KYC..."))
        try {
            // find the user from the db using the supplied user email

            
            const existingUser = await this.prisma.user.findFirst({
                where: {email: userPayload.email},
                include: {
                    address: true,
                    profile_image: true,
                    kyc_verification: true
                }
            })
            if(!existingUser) {
                console.log(colors.red("User not found"))
                throw new NotFoundException("User not found")
            }
            // Check if the user has already been verified
            if(existingUser.kyc_verification?.is_verified) {
                console.log(colors.red("User already verified"))
                throw new HttpException("User already verified", HttpStatus.BAD_REQUEST);
            }
    
            // Create or update KYC verification record
            const updatedUser = await this.prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    kyc_verification: {
                        upsert: {
                            create: {
                                id_type: dto.id_type,
                                id_no: dto.id_no,
                                status: "approved",
                                is_verified: false
                            },
                            update: {
                                id_type: dto.id_type ,
                                id_no: dto.id_no,
                                status: "approved",
                                is_verified: true
                            }
                        }
                    }
                },
                include: {
                    kyc_verification: true
                }
            });
    
            console.log(colors.magenta("User KYC verification submitted successfully"));
            this.stats.onKycApproved();
            return new ApiResponseDto(
                true, 
                "KYC verification submitted successfully", 
                {
                    id: updatedUser.kyc_verification?.id,
                    user_id: updatedUser.id,
                    id_type: updatedUser.kyc_verification?.id_type,
                    id_no: updatedUser.kyc_verification?.id_no,
                    status: updatedUser.kyc_verification?.status,
                    is_verified: updatedUser.kyc_verification?.is_verified
                }
            );
        } catch (error) {
            console.error(colors.red(`KYC verification error: ${error.message}`));
            throw new HttpException(
                error.response?.data?.message || 'KYC verification failed',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async saveFourDigitPin(userPayload: any, pin: string) {
        console.log(colors.cyan("Saving four-digit PIN..."));

        try {

            // Update the user's record with the PIN
            const updatedUser = await this.prisma.user.update({
                where: { id: userPayload.sub },
                data: { fourDigitPin: pin },
            });

            console.log(colors.magenta("Four-digit PIN saved successfully."));
            return new ApiResponseDto(true, "Four-digit PIN saved successfully.", {
                userId: updatedUser.id,
            });
        } catch (error) {
            console.error(colors.red(`Error saving four-digit PIN: ${error.message}`));
            throw new HttpException(
                error.response?.data?.message || "Error saving four-digit PIN.",
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async setupTransactionPin(dto: SetupTransactionPinDto, userPayload: any) {
        this.logger.log(colors.cyan("Setting up transaction PIN..."));

        try {
            // Validate PIN format (should be numeric and 4-6 digits)
            if (!/^\d{4,6}$/.test(dto.pin)) {
                this.logger.error(colors.red("Invalid PIN format"));
                throw new BadRequestException("PIN must be 4-6 digits");
            }

            // Check if user already has a transaction PIN
            const existingUser = await this.prisma.user.findUnique({
                where: { id: userPayload.sub },
                select: { transactionPinHash: true }
            });

            if (existingUser?.transactionPinHash) {
                throw new BadRequestException("Transaction PIN already set. Use update endpoint to change it.");
            }

            // Hash the PIN using bcrypt (salt rounds: 10 as per SECURITY.md)
            const saltRounds = 10;
            const hashedPin = await bcrypt.hash(dto.pin, saltRounds);

            // Store the hashed PIN
            const updatedUser = await this.prisma.user.update({
                where: { id: userPayload.sub },
                data: { transactionPinHash: hashedPin },
            });

            this.logger.log(colors.magenta("Transaction PIN set up successfully."));
            return new ApiResponseDto(true, "Transaction PIN set up successfully.", {
                userId: updatedUser.id,
            });
        } catch (error) {
            this.logger.error(colors.red(`Error setting up transaction PIN: ${error.message}`));
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new HttpException(
                error.response?.data?.message || "Error setting up transaction PIN.",
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async updateTransactionPin(dto: UpdateTransactionPinDto, userPayload: any) {
        this.logger.log(colors.cyan("Updating transaction PIN..."));

        try {
            // Validate new PIN format
            if (!/^\d{4,6}$/.test(dto.newPin)) {
                throw new BadRequestException("New PIN must be 4-6 digits");
            }

            // Check if new PIN is different from current PIN
            if (dto.currentPin === dto.newPin) {
                throw new BadRequestException("New PIN must be different from current PIN");
            }

            // Get user with transaction PIN hash
            const user = await this.prisma.user.findUnique({
                where: { id: userPayload.sub },
                select: { transactionPinHash: true }
            });

            if (!user) {
                throw new NotFoundException("User not found");
            }

            // Check if transaction PIN is set
            if (!user.transactionPinHash) {
                throw new BadRequestException("Transaction PIN not set. Please set up your transaction PIN first.");
            }

            // Verify current PIN
            const isCurrentPinValid = await bcrypt.compare(dto.currentPin, user.transactionPinHash);
            if (!isCurrentPinValid) {
                throw new BadRequestException("Current transaction PIN is incorrect");
            }

            // Hash the new PIN
            const saltRounds = 10;
            const hashedNewPin = await bcrypt.hash(dto.newPin, saltRounds);

            // Update the transaction PIN hash
            const updatedUser = await this.prisma.user.update({
                where: { id: userPayload.sub },
                data: { transactionPinHash: hashedNewPin },
            });

            this.logger.log(colors.magenta("Transaction PIN updated successfully."));
            return new ApiResponseDto(true, "Transaction PIN updated successfully.", {
                userId: updatedUser.id,
            });
        } catch (error) {
            this.logger.error(colors.red(`Error updating transaction PIN: ${error.message}`));
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new HttpException(
                error.response?.data?.message || "Error updating transaction PIN.",
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Request account deletion. Sets requested_account_deletion = true and sends confirmation email.
     */
    async requestAccountDeletion(userPayload: any, dto?: RequestAccountDeletionDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userPayload.sub },
            select: { id: true, first_name: true, email: true, requested_account_deletion: true },
        });
        if (!user) throw new NotFoundException('User not found');
        if (user.requested_account_deletion) {
            return new ApiResponseDto(
                true,
                'You have already requested account deletion. We will notify you via email once it is completed.',
                { requested_account_deletion: true },
            );
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                requested_account_deletion: true,
                account_deletion_requested_at: new Date(),
            },
        });
        if (user.email) {
            this.emailService
                .sendAccountDeletionRequestEmail(user.email, user.first_name || 'User')
                .catch((e) => this.logger.warn(`Account deletion email failed: ${e?.message}`));
        }
        this.logger.log(colors.cyan(`Account deletion requested for user ${user.id}`));
        return new ApiResponseDto(
            true,
            'Your account deletion request has been received. You will be notified via email once your account is deleted. This may take up to 7 business days.',
            { requested_account_deletion: true },
        );
    }

    /**
     * Cancel account deletion request. Sets requested_account_deletion = false.
     */
    async cancelAccountDeletionRequest(userPayload: any) {
        const user = await this.prisma.user.findUnique({
            where: { id: userPayload.sub },
            select: { id: true, requested_account_deletion: true },
        });
        if (!user) throw new NotFoundException('User not found');
        if (!user.requested_account_deletion) {
            return new ApiResponseDto(
                true,
                'You have no pending account deletion request.',
                { requested_account_deletion: false },
            );
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                requested_account_deletion: false,
                account_deletion_requested_at: null,
            },
        });
        this.logger.log(colors.green(`Account deletion request cancelled for user ${user.id}`));
        return new ApiResponseDto(
            true,
            'Your account deletion request has been cancelled.',
            { requested_account_deletion: false },
        );
    }
}