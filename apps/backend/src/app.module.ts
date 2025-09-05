import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// core
import { AppConfigurationModule } from '@core/configuration/configuration.module';
import { DatabaseModule } from '@core/database/database.module';
import { CacheModule } from '@core/cache/cache.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    CqrsModule.forRoot(),
    AppConfigurationModule,
    DatabaseModule,
    CacheModule,

    // modules
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
