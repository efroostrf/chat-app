export interface ICacheConfig {
  host?: string;
  port?: number;
  password?: string;
  defaultTTL: number;
  connectTimeout: number;
  commandTimeout: number;
  maxRetriesPerRequest: number;
}
