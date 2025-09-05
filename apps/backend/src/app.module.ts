import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// core
import { AppConfigurationModule } from '@core/configuration/configuration.module';
import { DatabaseModule } from '@core/database/database.module';
import { CacheModule } from '@core/cache/cache.module';

// controllers
import { AppController } from './app.controller';

// services
import { AppService } from './app.service';

@Module({
  imports: [
    CqrsModule.forRoot(),
    AppConfigurationModule,
    DatabaseModule,
    CacheModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
