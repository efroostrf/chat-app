import ENVIRONMENT_VARIABLES_SCHEMA, {
  EnvironmentVariables,
} from './configuration.schema';

export const VALID_ENVS: EnvironmentVariables = {
  NODE_ENV: 'testing',
  PORT: 3001,
  DATABASE_URL: 'postgresql://user:password@localhost:5432/test_db',
};

describe('AppConfigurationModule', () => {
  beforeEach(async () => {});

  afterEach(async () => {});

  describe('Configuration Schema Validation', () => {
    it('should validate the configuration schema', () => {
      const result = ENVIRONMENT_VARIABLES_SCHEMA.validate(VALID_ENVS);
      expect(result.error).toBeUndefined();
    });

    describe('NODE_ENV validation', () => {
      it('should accept valid NODE_ENV values', () => {
        const validValues = ['development', 'production', 'testing'];
        for (const value of validValues) {
          const result = ENVIRONMENT_VARIABLES_SCHEMA.validate({
            ...VALID_ENVS,
            NODE_ENV: value,
          });
          expect(result.error).toBeUndefined();
        }
      });

      it('should reject invalid NODE_ENV values', () => {
        const invalidValues = ['invalid', 'azure', 'aws', 'gcp'];
        for (const value of invalidValues) {
          const result = ENVIRONMENT_VARIABLES_SCHEMA.validate({
            ...VALID_ENVS,
            NODE_ENV: value,
          });
          expect(result.error).toBeDefined();
        }
      });

      it('should use default value when NODE_ENV is not provided', () => {
        const result = ENVIRONMENT_VARIABLES_SCHEMA.validate({
          ...VALID_ENVS,
          NODE_ENV: undefined,
        });
        expect(result.error).toBeUndefined();
        expect((result.value as EnvironmentVariables).NODE_ENV).toBe(
          'development',
        );
      });
    });

    describe('PORT validation', () => {
      it('should accept valid PORT values', () => {
        const validValues = ['3000', '8080', '80', '443', '65535'];
        for (const value of validValues) {
          const result = ENVIRONMENT_VARIABLES_SCHEMA.validate({
            ...VALID_ENVS,
            PORT: value,
          });
          expect(result.error).toBeUndefined();
        }
      });

      it('should reject invalid PORT values', () => {
        const invalidValues = ['0', '65536', '-1', 'abc', '3000.5'];
        for (const value of invalidValues) {
          const result = ENVIRONMENT_VARIABLES_SCHEMA.validate({
            ...VALID_ENVS,
            PORT: value,
          });
          expect(result.error).toBeDefined();
        }
      });

      it('should use default value when PORT is not provided', () => {
        const result = ENVIRONMENT_VARIABLES_SCHEMA.validate({
          ...VALID_ENVS,
          PORT: undefined,
        });
        expect(result.error).toBeUndefined();
        expect((result.value as EnvironmentVariables).PORT).toBe(3000);
      });
    });

    describe('DATABASE_URL validation', () => {
      it('should accept valid DATABASE_URL values', () => {
        const validValues = [
          'postgresql://user:password@localhost:5432/test_db',
          'postgresql://user:password@localhost:5432/test_db?param=value',
        ];
        for (const value of validValues) {
          const result = ENVIRONMENT_VARIABLES_SCHEMA.validate({
            ...VALID_ENVS,
            DATABASE_URL: value,
          });
          expect(result.error).toBeUndefined();
        }
      });

      it('should reject invalid DATABASE_URL values', () => {
        const invalidValues = [
          'invalid',
          'mysql://user:password@localhost:3306/test_db',
          'mongodb://user:password@localhost:27017/test_db',
          'postgresql://user@@@@localhost:5432/test_db',
          'postgresql:///user@localhost:5432/test_db',
          'postgresql://user@localhost:5432/test_db',
          'postgresql://user@localhost:::5432/test_db',
        ];
        for (const value of invalidValues) {
          const result = ENVIRONMENT_VARIABLES_SCHEMA.validate({
            ...VALID_ENVS,
            DATABASE_URL: value,
          });
          expect(result.error).toBeDefined();
        }
      });
    });
  });
});
