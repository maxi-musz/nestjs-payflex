import { Test, TestingModule } from '@nestjs/testing';
import { VasController } from './vas.controller';

describe('VasController', () => {
  let controller: VasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VasController],
    }).compile();

    controller = module.get<VasController>(VasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
