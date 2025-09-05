import { Test, TestingModule } from '@nestjs/testing';
import { SerializationService } from '../serialization.service';

describe('SerializationService', () => {
  let service: SerializationService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [SerializationService],
    }).compile();

    service = module.get<SerializationService>(SerializationService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Service Methods', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    describe('serialize', () => {
      it('should serialize a string', () => {
        const value = 'test';
        const result = service.serialize(value);
        expect(result).toBe(value);
      });

      it('should serialize a number', () => {
        const value = 123;
        const result = service.serialize(value);
        expect(result).toBe(value.toString());
      });

      it('should serialize an object', () => {
        const value = { test: 'test' };
        const result = service.serialize(value);
        expect(result).toBe(JSON.stringify(value));
      });

      it('should serialize an array', () => {
        const value = [1, 2, 3];
        const result = service.serialize(value);
        expect(result).toBe(JSON.stringify(value));
      });

      it('should serialize a boolean', () => {
        const value = true;
        const result = service.serialize(value);
        expect(result).toBe(value.toString());
      });

      it('should serialize a null', () => {
        const value = null;
        const result = service.serialize(value);
        expect(result).toBe(JSON.stringify(value));
      });

      it('should serialize a undefined', () => {
        const value = undefined;
        const result = service.serialize(value);
        expect(result).toBe(JSON.stringify(value));
      });
    });
  });

  describe('deserialize', () => {
    it('should deserialize a string', () => {
      const value = 'test';
      const result = service.deserialize(value);
      expect(result).toBe(value);
    });

    it('should deserialize a number', () => {
      const value = '123';
      const result = service.deserialize(value);
      expect(result).toBe(123);
    });

    it('should deserialize an object', () => {
      const value = '{"test":"test"}';
      const result = service.deserialize(value);
      expect(result).toEqual({ test: 'test' });
    });

    it('should deserialize an array', () => {
      const value = '[1,2,3]';
      const result = service.deserialize(value);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should deserialize a boolean', () => {
      const value = 'true';
      const result = service.deserialize(value);
      expect(result).toBe(true);
    });

    it('should deserialize a null', () => {
      const value = 'null';
      const result = service.deserialize(value);
      expect(result).toBe(null);
    });

    it('should deserialize a undefined', () => {
      const value = 'undefined';
      const result = service.deserialize(value);
      expect(result).toBe(undefined);
    });
  });

  describe('Error Handling', () => {
    it('should have logger defined', () => {
      expect(service['logger']).toBeDefined();
    });

    it('should have logger context defined', () => {
      expect(service['logger']['context']).toBe('SerializationService');
    });
  });
});
