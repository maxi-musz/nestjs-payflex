import { Test, TestingModule } from '@nestjs/testing';
import { VtuController } from './vtu.controller';

describe('VtuController', () => {
  let controller: VtuController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VtuController],
    }).compile();

    controller = module.get<VtuController>(VtuController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
