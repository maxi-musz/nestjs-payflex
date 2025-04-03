import { Test, TestingModule } from '@nestjs/testing';
import { VtuService } from './vtu.service';

describe('VtuService', () => {
  let service: VtuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VtuService],
    }).compile();

    service = module.get<VtuService>(VtuService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
