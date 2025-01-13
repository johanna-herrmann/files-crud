import DatabaseConfig from './DatabaseConfig';
import StorageConfig from '@/types/config/StorageConfig';
import PermissionConfig from '@/types/config/PermissionConfig';
import LoggingConfig from '@/types/config/LoggingConfig';
import ServerConfig from '@/types/config/ServerConfig';

interface Config {
  database?: DatabaseConfig;
  storage?: StorageConfig;
  logging?: LoggingConfig;
  path?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  register?: 'all' | 'admin' | 'token';
  tokens?: string[];
  directoryPermissions?: Record<string, PermissionConfig>;
  userDirectoryPermissions?: PermissionConfig;
  userFilePermissions?: PermissionConfig;
  defaultPermissions?: PermissionConfig;
  server?: ServerConfig;
  webRoot?: string;
}

export default Config;
