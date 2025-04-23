import { Injectable } from '@nestjs/common';
import { GIFTBILL_CONFIG } from 'src/common/config';
import { PrismaService } from 'src/prisma/prisma.service';
import * as colors from 'colors';

let apiUrl: string;
let apiKey: string;
let merchantId: string;

if (process.env.NODE_ENV === "production") {
    apiUrl = GIFTBILL_CONFIG.BASE_PROD_URL || "";
    apiKey = GIFTBILL_CONFIG.PROD_API_KEY || "";
    merchantId = GIFTBILL_CONFIG.MERCHANT_ID || "";
} else {
    apiUrl = GIFTBILL_CONFIG.BASE_SANDBOX_URL || "";
    apiKey = GIFTBILL_CONFIG.SANDBOX_API_KEY || "";
    merchantId = GIFTBILL_CONFIG.MERCHANT_ID || "";
}

@Injectable()
export class VasService {
    constructor(private prisma: PrismaService) {}
}

// async FetchAllBettingProvidersGiftBills() {
//     console.log(colors.cyan("Fetching all betting providers"))
// }
