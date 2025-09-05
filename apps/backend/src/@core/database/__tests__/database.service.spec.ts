import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database.service';
import { ConfigService } from '@nestjs/config';

describe('DatabaseService', () => {
  let service: DatabaseService;

  // Create mock ConfigService
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup default config values using the mock
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: any) => {
        const config = {
          DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
          NODE_ENV: 'test',
        };

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return config?.[key] ?? defaultValue;
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);

    // Mock database connection methods to prevent actual database calls
    jest.spyOn(service, '$connect').mockResolvedValue();
    jest.spyOn(service, '$disconnect').mockResolvedValue();
  });

  describe('Service Configuration', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have ConfigService injected', () => {
      expect(service.configService).toBeDefined();
      expect(service.configService).toBe(mockConfigService);
    });

    it('should initialize with correct configuration', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('DATABASE_URL');
      expect(mockConfigService.get).toHaveBeenCalledWith('NODE_ENV');
    });
  });

  describe('Service Lifecycle', () => {
    it('should connect to database on module init', async () => {
      await service.onModuleInit();

      expect(service.$connect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors gracefully', async () => {
      const error = new Error('Connection failed');
      jest.spyOn(service, '$connect').mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
    });

    it('should disconnect from database on module destroy', async () => {
      await service.onModuleDestroy();

      expect(service.$disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle disconnection errors gracefully', async () => {
      const error = new Error('Disconnection failed');
      jest.spyOn(service, '$disconnect').mockRejectedValue(error);

      // Should not throw, just log the error
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should have logger defined', () => {
      expect(service['logger']).toBeDefined();
    });

    it('should have logger context defined', () => {
      expect(service['logger']['context']).toBe('DatabaseService');
    });
  });
});
