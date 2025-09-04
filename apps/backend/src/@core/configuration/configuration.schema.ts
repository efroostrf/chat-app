import joi from 'joi';

export type EnvironmentVariables = {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
};

const ENVIRONMENT_VARIABLES_SCHEMA = joi.object<EnvironmentVariables>({
  NODE_ENV: joi
    .string()
    .valid('development', 'production', 'testing')
    .default('development'),
  PORT: joi.number().port().min(1).default(3000),

  // Database
  DATABASE_URL: joi
    .string()
    .pattern(
      /^postgresql:\/\/[a-zA-Z0-9_][a-zA-Z0-9_-]*:[^@:]+@[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9](?::[1-9]\d{0,4})?\/[a-zA-Z0-9_][a-zA-Z0-9_-]*(?:\?(?:[a-zA-Z0-9_]+=[\w%-]*(?:&[a-zA-Z0-9_]+=[\w%-]*)*)?)?$/,
    )
    .required()
    .messages({
      'string.pattern.base':
        'DATABASE_URL must be a valid PostgreSQL connection string in format: postgresql://user:password@host[:port]/database[?params]',
    }),
});

export default ENVIRONMENT_VARIABLES_SCHEMA;
