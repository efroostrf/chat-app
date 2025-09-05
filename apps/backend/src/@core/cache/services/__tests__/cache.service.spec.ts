// cache.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { CacheService } from '../cache.service';
import { SerializationService } from '../serialization.service';

// Mock ioredis
const mockRedisClient = {
  connect: jest.fn(),
  quit: jest.fn(),
  get: jest.fn(),
  setex: jest.fn(),
  on: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  flushall: jest.fn(),
  keys: jest.fn(),
  set: jest.fn(),
  eval: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisClient);
});

import Redis from 'ioredis';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

describe('CacheService', () => {
  let service: CacheService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let configService: ConfigService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let serializationService: SerializationService;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let loggerWarnSpy: jest.SpyInstance;

  // Create mocks outside beforeEach to ensure they're accessible
  const mockConfigService = {
    get: jest.fn(),
  };

  const mockSerializationService = {
    serialize: jest.fn(),
    deserialize: jest.fn(),
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SerializationService,
          useValue: mockSerializationService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);
    serializationService =
      module.get<SerializationService>(SerializationService);

    // Mock Logger to avoid console output during tests and store references
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    // Setup default config values using the mock directly
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: any) => {
        const config = {
          REDIS_HOST: 'localhost',
          REDIS_PORT: 6379,
          REDIS_PASSWORD: 'test-password',
          REDIS_DEFAULT_TTL: 3600,
        };

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return config?.[key] || defaultValue;
      },
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor and configuration', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should build cache config from environment variables', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('REDIS_HOST');
      expect(mockConfigService.get).toHaveBeenCalledWith('REDIS_PORT');
      expect(mockConfigService.get).toHaveBeenCalledWith('REDIS_PASSWORD');
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'REDIS_DEFAULT_TTL',
        3600,
      );
    });
  });

  describe('onModuleInit', () => {
    it('should initialize Redis client successfully', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        password: 'test-password',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        retryStrategy: expect.any(Function),
        connectTimeout: 5000,
        commandTimeout: 5000,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(loggerLogSpy).toHaveBeenCalledWith(
        'Cache service initialized successfully',
      );
    });

    it('should setup event handlers', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'ready',
        expect.any(Function),
      );
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      );
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'close',
        expect.any(Function),
      );
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'reconnecting',
        expect.any(Function),
      );
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'end',
        expect.any(Function),
      );
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Connection failed');
      mockRedisClient.connect.mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to initialize cache service:',
        error,
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect Redis client successfully', async () => {
      // First initialize the service
      mockRedisClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();

      mockRedisClient.quit.mockResolvedValue('OK');

      await service.onModuleDestroy();

      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(loggerLogSpy).toHaveBeenCalledWith(
        'Cache service disconnected successfully',
      );
    });

    it('should handle disconnection errors gracefully', async () => {
      // First initialize the service
      mockRedisClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();

      const error = new Error('Disconnection failed');
      mockRedisClient.quit.mockRejectedValue(error);

      await service.onModuleDestroy();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to disconnect from cache service:',
        error,
      );
    });

    it('should handle case when Redis client is not initialized', async () => {
      // Don't initialize the service, just call onModuleDestroy
      await service.onModuleDestroy();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'Cache service disconnected successfully',
      );
    });
  });

  describe('getClient', () => {
    it('should return Redis client when initialized', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();

      const client = service.getClient();

      expect(client).toBe(mockRedisClient);
    });

    it('should throw error when Redis client not initialized', () => {
      expect(() => service.getClient()).toThrow('Redis client not initialized');
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should get and deserialize value successfully', async () => {
      const key = 'test-key';
      const serializedValue = '{"data":"test"}';
      const deserializedValue = { data: 'test' };

      mockRedisClient.get.mockResolvedValue(serializedValue);
      mockSerializationService.deserialize.mockReturnValue(deserializedValue);

      const result = await service.get(key);

      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
      expect(mockSerializationService.deserialize).toHaveBeenCalledWith(
        serializedValue,
      );
      expect(result).toEqual(deserializedValue);
    });

    it('should return null when key does not exist', async () => {
      const key = 'non-existent-key';
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get(key);

      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
      expect(mockSerializationService.deserialize).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when value is empty string', async () => {
      const key = 'empty-key';
      mockRedisClient.get.mockResolvedValue('');

      const result = await service.get(key);

      expect(result).toBeNull();
    });

    it('should handle and re-throw errors', async () => {
      const key = 'error-key';
      const error = new Error('Redis get error');
      mockRedisClient.get.mockRejectedValue(error);

      await expect(service.get(key)).rejects.toThrow('Redis get error');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error getting value from cache:',
        error,
      );
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should serialize and set value with custom TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const ttl = 1800;
      const serializedValue = '{"data":"test"}';

      mockSerializationService.serialize.mockReturnValue(serializedValue);
      mockRedisClient.setex.mockResolvedValue('OK');

      const result = await service.set(key, value, ttl);

      expect(mockSerializationService.serialize).toHaveBeenCalledWith(value);
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        key,
        ttl,
        serializedValue,
      );
      expect(result).toBe(true);
    });

    it('should use default TTL when not provided', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const serializedValue = '{"data":"test"}';

      mockSerializationService.serialize.mockReturnValue(serializedValue);
      mockRedisClient.setex.mockResolvedValue('OK');

      const result = await service.set(key, value);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        key,
        3600,
        serializedValue,
      );
      expect(result).toBe(true);
    });

    it('should return false when setex returns non-OK result', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const serializedValue = '{"data":"test"}';

      mockSerializationService.serialize.mockReturnValue(serializedValue);
      mockRedisClient.setex.mockResolvedValue('ERROR');

      const result = await service.set(key, value);

      expect(result).toBe(false);
    });

    it('should return false when setex returns null/undefined', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const serializedValue = '{"data":"test"}';

      mockSerializationService.serialize.mockReturnValue(serializedValue);
      mockRedisClient.setex.mockResolvedValue(null);

      const result = await service.set(key, value);

      expect(result).toBe(false);
    });

    it('should handle and return false on errors', async () => {
      const key = 'error-key';
      const value = { data: 'test' };
      const error = new Error('Redis set error');

      mockSerializationService.serialize.mockReturnValue('{"data":"test"}');
      mockRedisClient.setex.mockRejectedValue(error);

      const result = await service.set(key, value);

      expect(result).toBe(false);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error setting value in cache:',
        error,
      );
    });
  });

  describe('del', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should delete key successfully when key exists', async () => {
      const key = 'test-key';
      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.del(key);

      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      const key = 'non-existent-key';
      mockRedisClient.del.mockResolvedValue(0);

      const result = await service.del(key);

      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
      expect(result).toBe(false);
    });

    it('should handle and return false on errors', async () => {
      const key = 'error-key';
      const error = new Error('Redis del error');
      mockRedisClient.del.mockRejectedValue(error);

      const result = await service.del(key);

      expect(result).toBe(false);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error deleting value from cache:',
        error,
      );
    });
  });

  describe('delMany', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should delete multiple keys successfully', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockRedisClient.del.mockResolvedValue(3);

      const result = await service.delMany(keys);

      expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
      expect(result).toBe(3);
    });

    it('should return 0 when empty array provided', async () => {
      const result = await service.delMany([]);

      expect(mockRedisClient.del).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('should handle partial deletion', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockRedisClient.del.mockResolvedValue(2); // Only 2 keys existed

      const result = await service.delMany(keys);

      expect(result).toBe(2);
    });

    it('should handle null result from Redis', async () => {
      const keys = ['key1', 'key2'];
      mockRedisClient.del.mockResolvedValue(null);

      const result = await service.delMany(keys);

      expect(result).toBe(0);
    });

    it('should handle and return 0 on errors', async () => {
      const keys = ['key1', 'key2'];
      const error = new Error('Redis delMany error');
      mockRedisClient.del.mockRejectedValue(error);

      const result = await service.delMany(keys);

      expect(result).toBe(0);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to delete keys from cache',
        error,
      );
    });
  });

  describe('exists', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should return true when key exists', async () => {
      const key = 'existing-key';
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await service.exists(key);

      expect(mockRedisClient.exists).toHaveBeenCalledWith(key);
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      const key = 'non-existent-key';
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await service.exists(key);

      expect(mockRedisClient.exists).toHaveBeenCalledWith(key);
      expect(result).toBe(false);
    });

    it('should return false when Redis returns null', async () => {
      const key = 'test-key';
      mockRedisClient.exists.mockResolvedValue(null);

      const result = await service.exists(key);

      expect(result).toBe(false);
    });

    it('should handle and return false on errors', async () => {
      const key = 'error-key';
      const error = new Error('Redis exists error');
      mockRedisClient.exists.mockRejectedValue(error);

      const result = await service.exists(key);

      expect(result).toBe(false);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error checking existence of key in cache:',
        error,
      );
    });
  });

  describe('expire', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should set expiration successfully when key exists', async () => {
      const key = 'test-key';
      const ttl = 3600;
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await service.expire(key, ttl);

      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, ttl);
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      const key = 'non-existent-key';
      const ttl = 3600;
      mockRedisClient.expire.mockResolvedValue(0);

      const result = await service.expire(key, ttl);

      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, ttl);
      expect(result).toBe(false);
    });

    it('should handle and return false on errors', async () => {
      const key = 'error-key';
      const ttl = 3600;
      const error = new Error('Redis expire error');
      mockRedisClient.expire.mockRejectedValue(error);

      const result = await service.expire(key, ttl);

      expect(result).toBe(false);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error expiring key in cache:',
        error,
      );
    });
  });

  describe('ttl', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should return TTL value for existing key', async () => {
      const key = 'test-key';
      const expectedTtl = 3600;
      mockRedisClient.ttl.mockResolvedValue(expectedTtl);

      const result = await service.ttl(key);

      expect(mockRedisClient.ttl).toHaveBeenCalledWith(key);
      expect(result).toBe(expectedTtl);
    });

    it('should return -1 for key without expiration', async () => {
      const key = 'persistent-key';
      mockRedisClient.ttl.mockResolvedValue(-1);

      const result = await service.ttl(key);

      expect(result).toBe(-1);
    });

    it('should return -2 for non-existent key', async () => {
      const key = 'non-existent-key';
      mockRedisClient.ttl.mockResolvedValue(-2);

      const result = await service.ttl(key);

      expect(result).toBe(-2);
    });

    it('should return 0 when Redis returns null', async () => {
      const key = 'test-key';
      mockRedisClient.ttl.mockResolvedValue(null);

      const result = await service.ttl(key);

      expect(result).toBe(0);
    });

    it('should handle and return 0 on errors', async () => {
      const key = 'error-key';
      const error = new Error('Redis ttl error');
      mockRedisClient.ttl.mockRejectedValue(error);

      const result = await service.ttl(key);

      expect(result).toBe(0);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error getting TTL of key in cache:',
        error,
      );
    });
  });

  describe('flushall', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should flush all keys successfully', async () => {
      mockRedisClient.flushall.mockResolvedValue('OK');

      const result = await service.flushall();

      expect(mockRedisClient.flushall).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when flushall fails', async () => {
      mockRedisClient.flushall.mockResolvedValue('ERROR');

      const result = await service.flushall();

      expect(result).toBe(false);
    });

    it('should handle and return false on errors', async () => {
      const error = new Error('Redis flushall error');
      mockRedisClient.flushall.mockRejectedValue(error);

      const result = await service.flushall();

      expect(result).toBe(false);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error flushing all keys from cache:',
        error,
      );
    });
  });

  describe('keys', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should return matching keys for pattern', async () => {
      const pattern = 'user:*';
      const expectedKeys = ['user:1', 'user:2', 'user:3'];
      mockRedisClient.keys.mockResolvedValue(expectedKeys);

      const result = await service.keys(pattern);

      expect(mockRedisClient.keys).toHaveBeenCalledWith(pattern);
      expect(result).toEqual(expectedKeys);
    });

    it('should return empty array when no keys match', async () => {
      const pattern = 'nonexistent:*';
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await service.keys(pattern);

      expect(result).toEqual([]);
    });

    it('should return empty array when Redis returns null', async () => {
      const pattern = 'test:*';
      mockRedisClient.keys.mockResolvedValue(null);

      const result = await service.keys(pattern);

      expect(result).toEqual([]);
    });

    it('should handle and return empty array on errors', async () => {
      const pattern = 'error:*';
      const error = new Error('Redis keys error');
      mockRedisClient.keys.mockRejectedValue(error);

      const result = await service.keys(pattern);

      expect(result).toEqual([]);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error getting keys from cache:',
        error,
      );
    });
  });

  describe('acquireLock', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();

      // Mock sleep to make tests faster
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    });

    it('should acquire lock successfully on first attempt', async () => {
      const key = 'resource-lock';
      const ttl = 60;
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await service.acquireLock(key, ttl);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'lock:resource-lock',
        expect.any(String),
        'EX',
        ttl,
        'NX',
      );
      expect(result).toBe(true);
    });

    it('should acquire lock with custom identifier', async () => {
      const key = 'resource-lock';
      const ttl = 60;
      const identifier = 'custom-id';
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await service.acquireLock(key, ttl, { identifier });

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'lock:resource-lock',
        identifier,
        'EX',
        ttl,
        'NX',
      );
      expect(result).toBe(true);
    });

    it('should retry and eventually acquire lock', async () => {
      const key = 'resource-lock';
      const ttl = 60;
      mockRedisClient.set
        .mockResolvedValueOnce(null) // First attempt fails
        .mockResolvedValueOnce(null) // Second attempt fails
        .mockResolvedValueOnce('OK'); // Third attempt succeeds

      const result = await service.acquireLock(key, ttl, { retries: 3 });

      expect(mockRedisClient.set).toHaveBeenCalledTimes(3);
      expect(result).toBe(true);
    });

    it('should fail to acquire lock after all retries', async () => {
      const key = 'resource-lock';
      const ttl = 60;
      mockRedisClient.set.mockResolvedValue(null); // Always fails

      const result = await service.acquireLock(key, ttl, { retries: 2 });

      expect(mockRedisClient.set).toHaveBeenCalledTimes(2);
      expect(result).toBe(false);
    });

    it('should handle and return false on errors', async () => {
      const key = 'error-lock';
      const ttl = 60;
      const error = new Error('Redis set error');
      mockRedisClient.set.mockRejectedValue(error);

      const result = await service.acquireLock(key, ttl);

      expect(result).toBe(false);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to acquire lock "error-lock"',
        error,
      );
    });
  });

  describe('releaseLock', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should release lock with identifier successfully', async () => {
      const key = 'resource-lock';
      const identifier = 'test-identifier';
      mockRedisClient.eval.mockResolvedValue(1);

      const result = await service.releaseLock(key, identifier);

      expect(mockRedisClient.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call("get", KEYS[1]) == ARGV[1]'),
        1,
        'lock:resource-lock',
        identifier,
      );
      expect(result).toBe(true);
    });

    it('should return false when identifier does not match', async () => {
      const key = 'resource-lock';
      const identifier = 'wrong-identifier';
      mockRedisClient.eval.mockResolvedValue(0);

      const result = await service.releaseLock(key, identifier);

      expect(result).toBe(false);
    });

    it('should force release without identifier', async () => {
      const key = 'resource-lock';
      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.releaseLock(key);

      expect(mockRedisClient.del).toHaveBeenCalledWith('lock:resource-lock');
      expect(result).toBe(true);
    });

    it('should handle and return false on errors', async () => {
      const key = 'error-lock';
      const identifier = 'test-identifier';
      const error = new Error('Redis eval error');
      mockRedisClient.eval.mockRejectedValue(error);

      const result = await service.releaseLock(key, identifier);

      expect(result).toBe(false);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to release lock "error-lock"',
        error,
      );
    });
  });
});
