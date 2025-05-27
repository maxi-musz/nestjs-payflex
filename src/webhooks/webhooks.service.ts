import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BankingService } from 'src/banking/banking.service';
import { FlutterwaveService } from 'src/flutterwave/flutterwave.service';
import * as colors from 'colors/safe';

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
}
