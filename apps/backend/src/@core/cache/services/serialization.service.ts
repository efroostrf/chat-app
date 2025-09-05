import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SerializationService {
  private readonly logger = new Logger(SerializationService.name);

  serialize<T>(value: T): string {
    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch (error) {
      this.logger.error('Error serializing value:', error);
      throw error;
    }
  }

  deserialize<T>(value: string): T {
    if (value === 'undefined') return undefined as T;
    if (value === 'null') return null as T;

    try {
      return JSON.parse(value) as T;
    } catch {
      // If JSON parsing fails, return as string
      return value as unknown as T;
    }
  }
}
