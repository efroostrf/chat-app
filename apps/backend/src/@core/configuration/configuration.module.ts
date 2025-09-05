import { Module } from '@nestjs/common';
import { ConfigModule, ConfigModuleOptions } from '@nestjs/config';

// schema
import ENVIRONMENT_VARIABLES_SCHEMA from './configuration.schema';

export const CONFIG_MODULE_OPTIONS: ConfigModuleOptions = {
  isGlobal: true,
  cache: true, // To increase performance of getting the config
  ignoreEnvFile: false,
  expandVariables: true,
  load: [],
  validationSchema: ENVIRONMENT_VARIABLES_SCHEMA,
  // Load different environment variables files based on the environment
  envFilePath: [
    `.env.${process.env.NODE_ENV}.local`, // .env.development.local (git ignored)
    `.env.${process.env.NODE_ENV}`, // .env.development
    '.env.local', // .env.local (git ignored)
    '.env', // .env (fallback)
  ],
};

@Module({
  imports: [ConfigModule.forRoot(CONFIG_MODULE_OPTIONS)],
})
export class AppConfigurationModule {}
