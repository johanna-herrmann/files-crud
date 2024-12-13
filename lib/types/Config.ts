import DatabaseConfig from './DatabaseConfig';
import StorageConfig from '@/types/StorageConfig';
import PermissionConfig from '@/types/PermissionConfig';

interface Config {
  database?: DatabaseConfig;
  storage?: StorageConfig;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  register?: 'all' | 'admin' | 'token';
  tokens?: string[];
  directoryPermissions?: Record<string, PermissionConfig>;
  userDirectoryPermissions?: PermissionConfig;
  userFilePermissions?: PermissionConfig;
  defaultPermissions?: PermissionConfig;
}

export default Config;
