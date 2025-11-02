import { Controller } from '@nestjs/common';
import { InsuranceService } from './insurance.service';

@Controller('vtpass/insurance')
export class InsuranceController {
  constructor(private insuranceService: InsuranceService) {}

  // Endpoints will be added here
}

