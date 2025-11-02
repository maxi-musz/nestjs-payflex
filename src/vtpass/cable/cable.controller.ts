import { Controller } from '@nestjs/common';
import { CableService } from './cable.service';

@Controller('vtpass/cable')
export class CableController {
  constructor(private cableService: CableService) {}

  // Endpoints will be added here
}

