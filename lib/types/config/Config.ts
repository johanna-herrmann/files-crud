import DatabaseConfig from './DatabaseConfig';
import StorageConfig from '@/types/storage/StorageConfig';
import PermissionConfig from '@/types/config/PermissionConfig';
import LoggingConfig from '@/types/config/LoggingConfig';

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
  webRoot?: string;
}

export default Config;
