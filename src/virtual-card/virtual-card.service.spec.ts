import { Test, TestingModule } from '@nestjs/testing';
import { VirtualCardService } from './virtual-card.service';

describe('VirtualCardService', () => {
  let service: VirtualCardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VirtualCardService],
    }).compile();

    service = module.get<VirtualCardService>(VirtualCardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
