import { DatabaseConfig } from './DatabaseConfig';
import { StorageConfig } from '@/types/config/StorageConfig';
import { LoggingConfig } from '@/types/config/LoggingConfig';
import { ServerConfig } from '@/types/config/ServerConfig';

interface Config {
  database?: DatabaseConfig;
  storage?: StorageConfig;
  logging?: LoggingConfig;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  register?: 'all' | 'admin' | 'token';
  tokens?: string[];
  directoryPermissions?: Record<string, string | string[]>;
  defaultPermissions?: string | string[];
  publicFileOwner?: 'all' | 'none';
  server?: ServerConfig;
  tokenExpiresInSeconds?: number;
  webRoot?: string;
}

export { Config };
