import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { GetTicketByNumberDto } from './dto/get-ticket.dto';
import { AddMessageToTicketDto } from './dto/add-message.dto';
import { PhoneValidator } from 'src/auth/helpers/phone.validator';
import { generateTicketNumber } from 'src/common/helper_functions/generators';
import { EmailService } from 'src/common/mailer/email.service';
import * as colors from 'colors';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Create a support ticket (for registration help or general support)
   * Can be used by both registered and unregistered users
   */
  /**
   * Helper method to fetch all tickets for an email address with their messages
   */
  private async getAllTicketsForEmail(email: string) {
    const allTickets = await this.prisma.supportTicket.findMany({
      where: {
        email: email.toLowerCase(),
      },
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
    });

    // Fetch messages for each ticket
    const ticketsWithMessages = await Promise.all(
      allTickets.map(async (ticket) => {
        const messages = await this.prisma.supportMessage.findMany({
          where: {
            ticket_id: ticket.id,
            is_internal: false, // Only return messages visible to users
          },
          orderBy: {
            createdAt: 'asc', // Oldest first within each ticket
          },
        });

        const formattedMessages = messages.map((msg) => ({
          id: msg.id,
          message: msg.message,
          is_from_user: msg.is_from_user,
          sender_email: msg.sender_email,
          sender_name: msg.sender_name,
          created_at: msg.createdAt,
          attachments: msg.attachments,
        }));

        return {
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          status: ticket.status,
          priority: ticket.priority,
          support_type: ticket.support_type,
          email: ticket.email,
          phone_number: ticket.phone_number,
          subject: ticket.subject,
          description: ticket.description,
          created_at: ticket.createdAt,
          updated_at: ticket.updatedAt,
          messages: formattedMessages,
          total_messages: formattedMessages.length,
        };
      }),
    );

    return ticketsWithMessages;
  }

  async createSupportTicket(
    dto: CreateSupportTicketDto,
    headers: any,
    ipAddress: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.log(
      colors.cyan(
        `Creating support ticket for ${dto.phone_number}.`,
      ),
    );

    try {
      // 0. Check if ticket_number is provided - if so, check if ticket exists
      if (dto.ticket_number) {
        const existingTicket = await this.prisma.supportTicket.findUnique({
          where: { ticket_number: dto.ticket_number },
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        });

        // If ticket exists, add message to it instead of creating new ticket
        if (existingTicket) {
          // Verify email matches ticket email (security check)
          if (existingTicket.email && existingTicket.email.toLowerCase() !== dto.email.toLowerCase()) {
            return new ApiResponseDto(
              false, 
              'Email address does not match the ticket owner. Please use the email associated with this ticket.', 
              null
            );
          }

          // Extract user agent
          const userAgent =
            headers['user-agent'] ||
            headers['User-Agent'] ||
            headers['x-user-agent'] ||
            null;

          // Create the message
          const supportMessage = await this.prisma.supportMessage.create({
            data: {
              ticket_id: existingTicket.id,
              message: dto.description,
              is_from_user: true,
              is_internal: false,
              sender_email: dto.email,
              sender_name: existingTicket.user?.first_name
                ? `${existingTicket.user.first_name} ${existingTicket.user.last_name || ''}`.trim()
                : null,
              user_id: existingTicket.user_id,
              ip_address: ipAddress,
              user_agent: userAgent,
            },
          });

          // Update ticket's last_response_at
          await this.prisma.supportTicket.update({
            where: { ticket_number: dto.ticket_number },
            data: {
              last_response_at: new Date(),
              updatedAt: new Date(),
            },
          });

          // Fetch all messages for this ticket (including the one just added)
          const allMessages = await this.prisma.supportMessage.findMany({
            where: {
              ticket_id: existingTicket.id,
              is_internal: false, // Only return messages visible to users
            },
            orderBy: {
              createdAt: 'asc', // Oldest first
            },
          });

          // Format messages for response
          const formattedMessages = allMessages.map((msg) => ({
            id: msg.id,
            message: msg.message,
            is_from_user: msg.is_from_user,
            sender_email: msg.sender_email,
            sender_name: msg.sender_name,
            created_at: msg.createdAt,
            attachments: msg.attachments,
          }));

          this.logger.log(
            colors.magenta(
              `Message added to existing ticket ${dto.ticket_number}. Total messages: ${formattedMessages.length}`,
            ),
          );

          // Send email notification with all enquiries (show last 5 or all if less than 5)
          try {
            const messagesForEmail = formattedMessages.slice(-5); // Get last 5 messages
            await this.emailService.sendSupportTicketUpdateEmail(
              existingTicket.email || dto.email,
              existingTicket.ticket_number,
              existingTicket.subject,
              messagesForEmail,
              formattedMessages.length,
              supportMessage.createdAt,
            );
            this.logger.log(colors.green(`Update email sent to ${existingTicket.email || dto.email}`));
          } catch (emailError) {
            // Log error but don't fail message addition
            this.logger.error(
              colors.yellow(`Failed to send update email: ${emailError.message}`),
            );
          }

          // Fetch all tickets for this email address
          const userEmail = existingTicket.email || dto.email;
          const allTicketsForUser = await this.getAllTicketsForEmail(userEmail);

          return new ApiResponseDto(true, 'New Enquiry added to existing ticket successfully', {
            tickets: allTicketsForUser,
            total_tickets: allTicketsForUser.length,
            message: 'Your Enquiry has been added to the existing support ticket.',
          });
        }
        // If ticket_number provided but doesn't exist, continue to create new ticket
        this.logger.log(
          colors.yellow(
            `Ticket number ${dto.ticket_number} not found. Creating new ticket.`,
          ),
        );
      }

      // 1. Format and validate phone number (if provided)
      let formattedPhone: string | null = null;
      if (dto.phone_number) {
        formattedPhone = PhoneValidator.formatPhoneToE164(dto.phone_number);
        if (!PhoneValidator.validatePhoneNumber(formattedPhone)) {
          throw new BadRequestException(
            'Phone number must be in E.164 format (+234XXXXXXXXXX) or a valid Nigerian number (08012345678, 2348012345678, etc.)',
          );
        }
      }

      // 2. Validate session_id if provided (should match registration progress)
      let registrationProgress: { phone_number: string; id: string } | null = null;
      if (dto.session_id) {
        registrationProgress = await this.prisma.registrationProgress.findUnique({
          where: { id: dto.session_id },
        });

        if (!registrationProgress) {
          return new ApiResponseDto(false, 'Invalid session ID. Please provide a valid registration session ID.', null);
        }

        // Verify phone number matches session (if phone number was provided)
        if (formattedPhone && registrationProgress.phone_number !== formattedPhone) {
          throw new BadRequestException(
            'Phone number does not match the provided session ID.',
          );
        }
      }

      // 3. Check if user exists (optional - for registered users, only if phone number provided)
      let existingUser: { id: string; email: string; first_name: string | null; last_name: string | null } | null = null;
      if (formattedPhone) {
        existingUser = await this.prisma.user.findFirst({
          where: { phone_number: formattedPhone },
          select: { id: true, email: true, first_name: true, last_name: true },
        });
      }

      // 4. Generate unique ticket number (always generate new one for new tickets)
      const ticketNumber = await generateTicketNumber(this.prisma);

      // 5. Extract user agent from headers
      const userAgent =
        headers['user-agent'] ||
        headers['User-Agent'] ||
        headers['x-user-agent'] ||
        null;

      // 6. Prepare device metadata (from DTO or headers)
      let deviceMetadata = dto.device_metadata;
      if (!deviceMetadata) {
        // Try to extract from headers
        const deviceId = headers['x-device-id'] || headers['X-Device-ID'];
        if (deviceId) {
          deviceMetadata = {
            device_id: deviceId,
            device_fingerprint:
              headers['x-device-fingerprint'] ||
              headers['X-Device-Fingerprint'] ||
              deviceId,
            device_name: headers['x-device-name'] || headers['X-Device-Name'],
            device_model: headers['x-device-model'] || headers['X-Device-Model'],
            platform:
              (headers['platform'] || headers['Platform'] || 'unknown').toLowerCase(),
            os_name: headers['x-os-name'] || headers['X-OS-Name'],
            os_version: headers['x-os-version'] || headers['X-OS-Version'],
            app_version: headers['x-app-version'] || headers['X-App-Version'],
            ip_address: ipAddress,
          };
        }
      }

      

      // 8. Create support ticket
      const supportTicket = await this.prisma.supportTicket.create({
        data: {
          ticket_number: ticketNumber,
          user_id: existingUser?.id || null,
          phone_number: formattedPhone,
          email: dto.email,
          subject: dto.subject,
          description: dto.description,
          support_type: "REGISTRATION_ISSUE",
          status: 'pending',
          priority: "high",
          related_registration_progress_id: registrationProgress?.id || null,
          device_metadata: deviceMetadata || null,
          ip_address: ipAddress,
          user_agent: userAgent,
          // Create the first message automatically
          messages: {
            create: {
              message: dto.description,
              is_from_user: true,
              is_internal: false,
              sender_email: dto.email,
              sender_name: existingUser?.first_name
                ? `${existingUser.first_name} ${existingUser.last_name || ''}`.trim()
                : null,
              user_id: existingUser?.id || null,
              ip_address: ipAddress,
              user_agent: userAgent,
            },
          },
        },
      });

      this.logger.log(
        colors.magenta(
          `Support ticket created successfully. Ticket: ${ticketNumber} for ${formattedPhone || 'no phone'}`,
        ),
      );

      // 9. Send confirmation email to user
      try {
        await this.emailService.sendSupportTicketConfirmationEmail(
          dto.email,
          ticketNumber,
          dto.subject,
          dto.description,
          supportTicket.createdAt,
        );
        this.logger.log(colors.green(`Confirmation email sent to ${dto.email}`));
      } catch (emailError) {
        // Log error but don't fail ticket creation
        this.logger.error(
          colors.yellow(`Failed to send confirmation email: ${emailError.message}`),
        );
      }

      // 10. Fetch all tickets for this email address
      const allTicketsForUser = await this.getAllTicketsForEmail(dto.email);

      // 11. Prepare response
      return new ApiResponseDto(true, 'Support ticket created successfully', {
        tickets: allTicketsForUser,
        total_tickets: allTicketsForUser.length,
        message:
          'Your Issue has been created. Our team will review it and respond as soon as possible.',
      });
    } catch (error) {
      this.logger.error(
        colors.red(`Support ticket creation error: ${error.message}`),
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to create support ticket',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get support ticket by ticket number with all messages
   */
  async getTicketByNumber(ticketNumber: string): Promise<ApiResponseDto<any>> {
    this.logger.log(
      colors.cyan(`Retrieving support ticket: ${ticketNumber}`),
    );

    try {
      // Find ticket with all messages and user info
      const ticket = await this.prisma.supportTicket.findUnique({
        where: { ticket_number: ticketNumber },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          messages: {
            where: {
              is_internal: false, // Only return messages visible to users
            },
            orderBy: {
              createdAt: 'asc', // Oldest first
            },
          },
        },
      });

      if (!ticket) {
        throw new BadRequestException(
          `Support ticket with number ${ticketNumber} not found.`,
        );
      }

      // Format messages for response
      const formattedMessages = ticket.messages.map((msg) => ({
        id: msg.id,
        message: msg.message,
        is_from_user: msg.is_from_user,
        sender_email: msg.sender_email,
        sender_name: msg.sender_name,
        created_at: msg.createdAt,
        attachments: msg.attachments,
      }));

      this.logger.log(
        colors.magenta(
          `Retrieved ticket ${ticketNumber} with ${formattedMessages.length} messages`,
        ),
      );

      return new ApiResponseDto(true, 'Support ticket retrieved successfully', {
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        email: ticket.email,
        phone_number: ticket.phone_number,
        status: ticket.status,
        priority: ticket.priority,
        support_type: ticket.support_type,
        created_at: ticket.createdAt,
        updated_at: ticket.updatedAt,
        messages: formattedMessages,
        total_messages: formattedMessages.length,
      });
    } catch (error) {
      this.logger.error(
        colors.red(`Error retrieving ticket ${ticketNumber}: ${error.message}`),
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to retrieve support ticket',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Add a message to an existing support ticket
   */
  async addMessageToTicket(
    dto: AddMessageToTicketDto,
    headers: any,
    ipAddress: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.log(
      colors.cyan(`Adding message to ticket: ${dto.ticket_number}`),
    );

    try {
      // 1. Find the ticket with user relation
      const ticket = await this.prisma.supportTicket.findUnique({
        where: { ticket_number: dto.ticket_number },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      if (!ticket) {
        throw new BadRequestException(
          `Support ticket with number ${dto.ticket_number} not found.`,
        );
      }

      // 2. Verify email matches ticket email (security check)
      if (ticket.email && ticket.email.toLowerCase() !== dto.email.toLowerCase()) {
        throw new BadRequestException(
          'Email address does not match the ticket owner. Please use the email associated with this ticket.',
        );
      }

      // 3. Extract user agent
      const userAgent =
        headers['user-agent'] ||
        headers['User-Agent'] ||
        headers['x-user-agent'] ||
        null;

      // 4. Create the message
      const supportMessage = await this.prisma.supportMessage.create({
        data: {
          ticket_id: ticket.id,
          message: dto.message,
          is_from_user: true,
          is_internal: false,
          sender_email: dto.email,
          sender_name: ticket.user?.first_name
            ? `${ticket.user.first_name} ${ticket.user.last_name || ''}`.trim()
            : null,
          user_id: ticket.user_id,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      });

      // 5. Update ticket's last_response_at
      await this.prisma.supportTicket.update({
        where: { ticket_number: dto.ticket_number },
        data: {
          last_response_at: new Date(),
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        colors.magenta(
          `Message added successfully to ticket ${dto.ticket_number}`,
        ),
      );

      return new ApiResponseDto(true, 'Message added successfully', {
        message_id: supportMessage.id,
        ticket_number: dto.ticket_number,
        message: supportMessage.message,
        created_at: supportMessage.createdAt,
      });
    } catch (error) {
      this.logger.error(
        colors.red(
          `Error adding message to ticket ${dto.ticket_number}: ${error.message}`,
        ),
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to add message to ticket',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

