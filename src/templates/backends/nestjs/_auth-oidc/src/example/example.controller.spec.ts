import { Test, TestingModule } from '@nestjs/testing';
import { ExampleController } from './example.controller';

describe('ExampleController', () => {
  let controller: ExampleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExampleController],
    }).compile();
    controller = module.get<ExampleController>(ExampleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /public returns public endpoint response', () => {
    const result = controller.getPublic();
    expect(result).toHaveProperty('message');
    expect(result.authenticated).toBe(false);
  });
});
