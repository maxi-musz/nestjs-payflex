import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BankingService } from 'src/banking/banking.service';
import { FlutterwaveService } from 'src/flutterwave/flutterwave.service';
import * as colors from 'colors/safe';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly configService: ConfigService,
    private readonly flutterwaveService: FlutterwaveService,
    private readonly bankingService: BankingService
  ) {}

  async handleFlutterwaveEvent(payload: any, headers: any): Promise<void> {
    const expectedHash = this.configService.get<string>('FLUTTERWAVE_HASH');
    const receivedHash = headers['verif-hash'];

    console.log(colors.cyan('Received Flutterwave webhook payload:'), payload);

    if (!receivedHash || receivedHash !== expectedHash) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const { event } = payload;
    console.log(colors.green('Processing Flutterwave event:'), event);

    switch (event) {
      case 'bvn.completed':
        await this.flutterwaveService.verifyBvnWebhook(payload);
        break;

      case 'transfer.completed':
        // await this.bankingService.handleTransferWebhook(payload);
        break;

      default:
        console.warn('Unhandled event:', event);
    }
  }

  async handlePaystackEvent(payload: any, headers: any, rawBody?: Buffer): Promise<void> {
    const secretKey = 
      process.env.NODE_ENV === 'development'
        ? this.configService.get<string>('PAYSTACK_TEST_SECRET_KEY')
        : this.configService.get<string>('PAYSTACK_LIVE_SECRET_KEY');

    const hash = headers['x-paystack-signature'];
    
    console.log(colors.cyan('Received Paystack webhook payload'));

    // Verify webhook signature
    if (hash && rawBody && secretKey) {
      const computedHash = crypto
        .createHmac('sha512', secretKey)
        .update(rawBody)
        .digest('hex');
      
      if (hash !== computedHash) {
        console.error(colors.red('Invalid Paystack webhook signature'));
        throw new UnauthorizedException('Invalid webhook signature');
      }
    } else if (hash && !secretKey) {
      console.warn(colors.yellow('Paystack secret key not configured, skipping signature verification'));
    }

    const { event, data } = payload;
    console.log(colors.green(`Processing Paystack event: ${event}`));

    // Handle different Paystack events
    switch (event) {
      case 'charge.success':
      case 'transaction.success':
        await this.bankingService.handlePaystackPaymentSuccess(data);
        break;

      case 'charge.failed':
      case 'transaction.failed':
        await this.bankingService.handlePaystackPaymentFailed(data);
        break;

      case 'transfer.success':
        await this.bankingService.handlePaystackTransferSuccess(data);
        break;

      case 'transfer.failed':
        await this.bankingService.handlePaystackTransferFailed(data);
        break;

      default:
        console.warn(colors.yellow(`Unhandled Paystack event: ${event}`));
    }
  }
}
