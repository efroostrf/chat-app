import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AppConfigurationModule } from '@core/configuration/configuration.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [CqrsModule.forRoot(), AppConfigurationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
