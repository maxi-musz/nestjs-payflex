import { Test, TestingModule } from '@nestjs/testing';
import { VasService } from './vas.service';

describe('VasService', () => {
  let service: VasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VasService],
    }).compile();

    service = module.get<VasService>(VasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
