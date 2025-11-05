import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FlutterwaveService } from 'src/flutterwave/flutterwave.service';
import { PaystackWebhookService } from './paystack-webhook/paystack-webhook.service';
import { VtpassWebhookService } from './vtpass-webhook/vtpass-webhook.service';
import * as colors from 'colors/safe';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly configService: ConfigService,
    private readonly flutterwaveService: FlutterwaveService,
    private readonly paystackWebhookService: PaystackWebhookService,
    private readonly vtpassWebhookService: VtpassWebhookService
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
        // Handle Flutterwave transfer webhook if needed
        break;

      default:
        console.warn('Unhandled event:', event);
    }
  }

  async handlePaystackEvent(payload: any, headers: any, rawBody?: Buffer): Promise<void> {
    const hash = headers['x-paystack-signature'];
    
    console.log(colors.cyan('Received Paystack webhook payload'));

    // Delegate to PaystackWebhookService
    await this.paystackWebhookService.handleWebhookEvent(
      payload,
      rawBody || Buffer.from(JSON.stringify(payload)),
      hash || ''
    );
  }

  async handleVtpassEvent(payload: any): Promise<void> {
    console.log(colors.cyan('Received VTpass webhook payload'));

    // Delegate to VtpassWebhookService
    await this.vtpassWebhookService.handleWebhookEvent(payload);
  }
}
