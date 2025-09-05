import { Global, Module } from '@nestjs/common';

// services
import { CacheService } from './services/cache.service';
import { SerializationService } from './services/serialization.service';

@Global()
@Module({
  providers: [SerializationService, CacheService],
  exports: [CacheService],
})
export class CacheModule {}
