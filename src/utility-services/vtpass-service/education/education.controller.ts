import { Controller } from '@nestjs/common';
import { EducationService } from './education.service';

@Controller('vtpass/education')
export class EducationController {
  constructor(private educationService: EducationService) {}

  // Endpoints will be added here
}

