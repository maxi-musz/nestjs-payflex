import { Controller } from '@nestjs/common';
import { ElectricityService } from './electricity.service';

@Controller('vtpass/electricity')
export class ElectricityController {
  constructor(private electricityService: ElectricityService) {}

  // Endpoints will be added here
}

