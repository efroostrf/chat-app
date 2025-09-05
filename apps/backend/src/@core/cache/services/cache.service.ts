import Redis, { RedisOptions } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

// nest
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';

// services
import { SerializationService } from './serialization.service';

// types
import { ICacheConfig } from '../interfaces/cache.interface';
import { CacheLockOptions } from '../types/cache.types';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  private redisClient?: Redis;
  private cacheConfig: ICacheConfig;

  constructor(
    public readonly configService: ConfigService,
    public readonly serializationService: SerializationService,
  ) {
    this.cacheConfig = this.buildCacheConfig();
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
      this.logger.log('Cache service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize cache service:', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redisClient?.quit();
      this.logger.log('Cache service disconnected successfully');
    } catch (error) {
      this.logger.error('Failed to disconnect from cache service:', error);
    }
  }

  private async connect(): Promise<void> {
    const redisOptions: RedisOptions = {
      host: this.cacheConfig.host,
      port: this.cacheConfig.port,
      password: this.cacheConfig.password,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(
          `Redis connection retry attempt ${times}, delay: ${delay}ms`,
        );
        return delay;
      },
      connectTimeout: this.cacheConfig.connectTimeout,
      commandTimeout: this.cacheConfig.commandTimeout,
      maxRetriesPerRequest: this.cacheConfig.maxRetriesPerRequest,
      enableReadyCheck: true,
      lazyConnect: true,
    };

    this.redisClient = new Redis(redisOptions);

    // Setup event handlers before connecting
    this.setupEventHandlers();

    await this.redisClient.connect();
  }

  private setupEventHandlers(): void {
    if (!this.redisClient) {
      this.logger.error(
        'Redis client not initialized for setting up event handlers',
      );
      return;
    }

    this.redisClient.on('connect', () => {
      this.logger.log('Redis connection established');
    });

    this.redisClient.on('ready', () => {
      this.logger.log('Redis client ready to receive commands');
    });

    this.redisClient.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.redisClient.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.redisClient.on('reconnecting', () => {
      this.logger.log('Redis reconnecting...');
    });

    this.redisClient.on('end', () => {
      this.logger.warn('Redis connection ended');
    });
  }

  private buildCacheConfig(): ICacheConfig {
    return {
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      defaultTTL: this.configService.get<number>('REDIS_DEFAULT_TTL', 3600),
      connectTimeout: 5_000,
      commandTimeout: 5_000,
      maxRetriesPerRequest: 3,
    };
  }

  getClient(): Redis {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }

    return this.redisClient;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisClient?.get(key);

      if (!value) return null;

      return this.serializationService.deserialize<T>(value);
    } catch (error) {
      this.logger.error('Error getting value from cache:', error);
      throw error;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const serializedValue = this.serializationService.serialize(value);
      const expiration = ttl ?? this.cacheConfig.defaultTTL;

      const result = await this.redisClient?.setex(
        key,
        expiration,
        serializedValue,
      );

      if (!result) {
        return false;
      }

      return result === 'OK';
    } catch (error) {
      this.logger.error('Error setting value in cache:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient?.del(key);

      return result === 1;
    } catch (error) {
      this.logger.error('Error deleting value from cache:', error);
      return false;
    }
  }

  async delMany(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;

    try {
      const result = await this.redisClient?.del(...keys);

      return result ?? 0;
    } catch (error) {
      this.logger.error(`Failed to delete keys from cache`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient?.exists(key);

      if (!result) return false;

      return result === 1;
    } catch (error) {
      this.logger.error('Error checking existence of key in cache:', error);
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.redisClient?.expire(key, ttl);
      return result === 1;
    } catch (error) {
      this.logger.error('Error expiring key in cache:', error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const result = await this.redisClient?.ttl(key);
      return result ?? 0;
    } catch (error) {
      this.logger.error('Error getting TTL of key in cache:', error);
      return 0;
    }
  }

  async flushall(): Promise<boolean> {
    try {
      const result = await this.redisClient?.flushall();
      return result === 'OK';
    } catch (error) {
      this.logger.error('Error flushing all keys from cache:', error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const result = await this.redisClient?.keys(pattern);
      return result ?? [];
    } catch (error) {
      this.logger.error('Error getting keys from cache:', error);
      return [];
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async acquireLock(
    key: string,
    ttl: number,
    options?: Partial<CacheLockOptions>,
  ): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const identifier: string = options?.identifier ?? uuidv4();
    const retries = options?.retries ?? 3;
    const retryDelay = options?.retryDelay ?? 1000;

    try {
      for (let i = 0; i < retries; i++) {
        const result = await this.redisClient?.set(
          lockKey,
          identifier,
          'EX',
          ttl,
          'NX',
        );

        if (result === 'OK') {
          return true;
        }

        if (i < retries - 1) {
          await this.sleep(retryDelay);
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to acquire lock "${key}"`, error);
      return false;
    }
  }

  async releaseLock(key: string, identifier?: string): Promise<boolean> {
    const lockKey = `lock:${key}`;

    if (!identifier) {
      // Force release without identifier check
      await this.del(lockKey);
      return true;
    }

    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = (await this.redisClient?.eval(
        script,
        1,
        lockKey,
        identifier,
      )) as number;
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to release lock "${key}"`, error);
      return false;
    }
  }
}
