import { Controller } from '@nestjs/common';
import { AirtimeService } from './airtime.service';

@Controller('vtpass/airtime')
export class AirtimeController {
  constructor(private airtimeService: AirtimeService) {}

  // Endpoints will be added here
}

