import { Test, TestingModule } from '@nestjs/testing';
import { FeathersServiceProvider } from './feathers-service.provider';

describe('FeathersServiceProvider', () => {
  let provider: FeathersServiceProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeathersServiceProvider],
    }).compile();

    provider = module.get<FeathersServiceProvider>(FeathersServiceProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
