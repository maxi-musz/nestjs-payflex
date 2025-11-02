import { Controller } from '@nestjs/common';
import { DataService } from './data.service';

@Controller('vtpass/data')
export class DataController {
  constructor(private dataService: DataService) {}

  // Endpoints will be added here
}

