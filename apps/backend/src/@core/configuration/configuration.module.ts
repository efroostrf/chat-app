import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true, // To increase performance of getting the config
      ignoreEnvFile: false,
      expandVariables: true,
      load: [],
      validationSchema: joi.object({
        NODE_ENV: joi
          .string()
          .valid('development', 'production')
          .default('development'),
        PORT: joi.number().port().default(3000),

        // Database
        DATABASE_URL: joi.string().required(),
      }),
      // Load different environment variables files based on the environment
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`, // .env.development.local (git ignored)
        `.env.${process.env.NODE_ENV}`, // .env.development
        '.env.local', // .env.local (git ignored)
        '.env', // .env (fallback)
      ],
    }),
  ],
})
export class AppConfigurationModule {}
