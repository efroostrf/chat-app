import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database.service';
import { DatabaseModule } from '../database.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  providers: [],
  exports: [],
})
export class TestConfigModule {}

describe('DatabaseModule', () => {
  let module: TestingModule;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await Test.createTestingModule({
      imports: [TestConfigModule, DatabaseModule],
    }).compile();

    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Configuration', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should provide DatabaseService', () => {
      expect(databaseService).toBeDefined();
    });

    it('should export DatabaseService', () => {
      const exportedService = module.get<DatabaseService>(DatabaseService);
      expect(exportedService).toBeDefined();
    });
  });

  describe('Module Dependencies', () => {
    it('should have DatabaseService as a provider', () => {
      const providers = module.get<DatabaseService>(DatabaseService);

      expect(providers).toBeDefined();
    });

    it('should initialize DatabaseService with correct configuration', () => {
      expect(databaseService.configService).toBeDefined();
      expect(databaseService.configService).toBeInstanceOf(ConfigService);
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize module without errors', async () => {
      await expect(module.init()).resolves.not.toThrow();
    });

    it('should close module without errors', async () => {
      await module.init();
      await expect(module.close()).resolves.not.toThrow();
    });

    it('should handle module initialization with database connection', async () => {
      const connectSpy = jest
        .spyOn(databaseService, '$connect')
        .mockImplementation(() => Promise.resolve());

      await module.init();

      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle module destruction with database disconnection', async () => {
      const disconnectSpy = jest
        .spyOn(databaseService, '$disconnect')
        .mockImplementation(() => Promise.resolve());

      await module.init();
      await module.close();

      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should have logger defined', () => {
      expect(databaseService['logger']).toBeDefined();
    });

    it('should have logger context defined', () => {
      expect(databaseService['logger']['context']).toBe('DatabaseService');
    });
  });
});
