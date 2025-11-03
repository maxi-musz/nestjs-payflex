import { BadRequestException, Injectable, Logger, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { FindUserByTagDto, SendMoneyByTagDto } from './dto/smipay-transfer.dto';
import { generateSessionId, generateUniqueTransactionReference } from 'src/common/helper_functions/generators';
import * as colors from 'colors/safe';

@Injectable()
export class SmipayService {
  private readonly logger = new Logger(SmipayService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Find a user by their Smipay tag
   * Returns minimal user information (name, tag, profile image) without sensitive data
   */
  async findUserBySmipayTag(dto: FindUserByTagDto, userPayload: any): Promise<ApiResponseDto<any>> {
    this.logger.log(`Finding user by Smipay tag: ${dto.smipay_tag}`);
    this.logger.debug(`Requested by user: ${userPayload.email} (${userPayload.sub})`);

    try {
      // Normalize the tag (remove spaces)
      const normalizedTag = dto.smipay_tag.trim();

      if (!normalizedTag) {
        this.logger.warn('Empty Smipay tag provided');
        throw new BadRequestException('Smipay tag cannot be empty');
      }

      // Find user by Smipay tag (case-insensitive)
      const user = await this.prisma.user.findFirst({
        where: {
          smipay_tag: {
            equals: normalizedTag,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          middle_name: true,
          smipay_tag: true,
          profile_image: {
            select: {
              secure_url: true,
              public_id: true,
            },
          },
          is_email_verified: true,
          is_phone_verified: true,
        },
      });

      if (!user) {
        this.logger.warn(`User not found with Smipay tag: ${dto.smipay_tag}`);
        return new ApiResponseDto(
          false,
          `User with Smipay tag '${dto.smipay_tag}' not found`,
          null
        );
      }

      // Check if user is trying to find themselves
      if (user.id === userPayload.sub) {
        this.logger.warn(`User attempted to find themselves by tag: ${dto.smipay_tag}`);
        return new ApiResponseDto(
          false,
          'You cannot send money to yourself',
          null
        );
      }

      const userInfo = {
        id: user.id,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
        smipay_tag: user.smipay_tag,
        profile_image: user.profile_image?.secure_url || null,
        is_verified: user.is_email_verified && user.is_phone_verified,
      };

      this.logger.log(`User found: ${userInfo.name} (${user.smipay_tag})`);
      return new ApiResponseDto(
        true,
        'User found successfully',
        userInfo
      );

    } catch (error: any) {
      this.logger.error(`Error finding user by Smipay tag: ${error.message}`, error.stack);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to find user by Smipay tag',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Send money from one Smipay user to another using Smipay tag
   */
  async sendMoneyByTag(dto: SendMoneyByTagDto, userPayload: any): Promise<ApiResponseDto<any>> {
    this.logger.log(`Initiating transfer from ${userPayload.email} to tag: ${dto.recipient_tag}`);
    this.logger.debug(`Transfer details: Amount: ${dto.amount} NGN, Narration: ${dto.narration || 'N/A'}`);

    // Start database transaction
    return await this.prisma.$transaction(async (tx) => {
      try {
        // Get sender user with wallet
        const sender = await tx.user.findUnique({
          where: { id: userPayload.sub },
          include: { wallet: true },
        });

        if (!sender) {
          this.logger.error(`Sender user not found: ${userPayload.sub}`);
          throw new NotFoundException('User not found');
        }

        if (!sender.wallet) {
          this.logger.error(`Sender wallet not found for user: ${userPayload.sub}`);
          throw new BadRequestException('Wallet not found. Please contact support.');
        }

        // Validate sender has Smipay tag
        if (!sender.smipay_tag) {
          this.logger.error(`Sender does not have Smipay tag: ${userPayload.sub}`);
          throw new BadRequestException('You do not have a Smipay tag. Please set one up first.');
        }

        // Normalize recipient tag for comparison
        const normalizedRecipientTag = dto.recipient_tag.trim();
        
        // Check if sender is trying to send to themselves
        if (sender.smipay_tag?.toLowerCase() === normalizedRecipientTag.toLowerCase()) {
          this.logger.warn(`User attempted to send money to themselves: ${userPayload.sub}`);
          throw new BadRequestException('You cannot send money to yourself');
        }

        // Validate amount
        if (dto.amount <= 0) {
          this.logger.warn(`Invalid amount provided: ${dto.amount}`);
          throw new BadRequestException('Amount must be greater than 0');
        }

        // Check sender balance
        if (sender.wallet.current_balance < dto.amount) {
          this.logger.warn(`Insufficient balance. Required: ${dto.amount}, Available: ${sender.wallet.current_balance}`);
          throw new BadRequestException(
            `Insufficient balance. You have ${sender.wallet.current_balance} NGN, but trying to send ${dto.amount} NGN`
          );
        }

        // Find recipient by Smipay tag (case-insensitive)
        const recipient = await tx.user.findFirst({
          where: {
            smipay_tag: {
              equals: normalizedRecipientTag,
              mode: 'insensitive',
            },
          },
          include: { wallet: true },
        });

        if (!recipient) {
          this.logger.warn(`Recipient not found with tag: ${dto.recipient_tag}`);
          throw new NotFoundException(`User with Smipay tag '${dto.recipient_tag}' not found`);
        }

        if (!recipient.wallet) {
          this.logger.error(`Recipient wallet not found: ${recipient.id}`);
          throw new BadRequestException('Recipient wallet not found. Please contact support.');
        }

        // Generate transaction reference
        const transactionReference = await generateUniqueTransactionReference(tx);
        const sessionId = generateSessionId();

        // Calculate balances
        const senderBalanceBefore = sender.wallet.current_balance;
        const senderBalanceAfter = senderBalanceBefore - dto.amount;
        const recipientBalanceBefore = recipient.wallet.current_balance;
        const recipientBalanceAfter = recipientBalanceBefore + dto.amount;

        this.logger.log(`Transfer calculation:`);
        this.logger.log(`  Sender balance: ${senderBalanceBefore} → ${senderBalanceAfter} NGN`);
        this.logger.log(`  Recipient balance: ${recipientBalanceBefore} → ${recipientBalanceAfter} NGN`);

        // Update sender wallet
        await tx.wallet.update({
          where: { id: sender.wallet.id },
          data: {
            current_balance: senderBalanceAfter,
            all_time_withdrawn: {
              increment: dto.amount,
            },
            updatedAt: new Date(),
          },
        });

        this.logger.debug(`Updated sender wallet: ${sender.wallet.id}`);

        // Update recipient wallet
        await tx.wallet.update({
          where: { id: recipient.wallet.id },
          data: {
            current_balance: recipientBalanceAfter,
            all_time_fuunding: {
              increment: dto.amount,
            },
            updatedAt: new Date(),
          },
        });

        this.logger.debug(`Updated recipient wallet: ${recipient.wallet.id}`);

        // Create sender transaction record (debit)
        const senderTransaction = await tx.transactionHistory.create({
          data: {
            user_id: sender.id,
            amount: dto.amount,
            transaction_type: 'transfer',
            credit_debit: 'debit',
            description: dto.narration || `Transfer to ${recipient.smipay_tag}`,
            status: 'success',
            currency_type: 'ngn',
            payment_method: 'wallet',
            payment_channel: 'smipay_tag',
            transaction_reference: transactionReference,
            balance_before: senderBalanceBefore,
            balance_after: senderBalanceAfter,
            session_id: sessionId,
            meta_data: {
              transfer_type: 'smipay_tag',
              recipient_tag: recipient.smipay_tag,
              recipient_id: recipient.id,
              recipient_name: `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim(),
              narration: dto.narration || null,
            },
          },
        });

        this.logger.debug(`Created sender transaction: ${senderTransaction.id}`);

        // Create recipient transaction record (credit)
        const recipientTransaction = await tx.transactionHistory.create({
          data: {
            user_id: recipient.id,
            amount: dto.amount,
            transaction_type: 'transfer',
            credit_debit: 'credit',
            description: dto.narration || `Received from ${sender.smipay_tag}`,
            status: 'success',
            currency_type: 'ngn',
            payment_method: 'wallet',
            payment_channel: 'smipay_tag',
            transaction_reference: `${transactionReference}-R`,
            balance_before: recipientBalanceBefore,
            balance_after: recipientBalanceAfter,
            session_id: sessionId,
            meta_data: {
              transfer_type: 'smipay_tag',
              sender_tag: sender.smipay_tag,
              sender_id: sender.id,
              sender_name: `${sender.first_name || ''} ${sender.last_name || ''}`.trim(),
              narration: dto.narration || null,
            },
          },
        });

        this.logger.debug(`Created recipient transaction: ${recipientTransaction.id}`);

        const response = {
          transaction_id: senderTransaction.id,
          transaction_reference: transactionReference,
          amount: dto.amount,
          recipient: {
            name: `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim(),
            smipay_tag: recipient.smipay_tag,
          },
          sender_balance_after: senderBalanceAfter,
          status: 'success',
          timestamp: new Date().toISOString(),
        };

        this.logger.log(
          colors.green(
            `✅ Transfer successful: ${sender.smipay_tag} → ${recipient.smipay_tag} | Amount: ${dto.amount} NGN | Reference: ${transactionReference}`
          )
        );

        return new ApiResponseDto(
          true,
          'Money sent successfully',
          response
        );

      } catch (error: any) {
        this.logger.error(`Error processing Smipay transfer: ${error.message}`, error.stack);
        
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
          throw error;
        }
        
        throw new HttpException(
          'Failed to process transfer. Please try again.',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    });
  }
}

