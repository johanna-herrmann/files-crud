import DatabaseConfig from './DatabaseConfig';
import StorageConfig from '@/types/StorageConfig';

interface Config {
  database?: DatabaseConfig;
  storage?: StorageConfig;
  accessKeyId?: string;
  secretAccessKey?: string;
  register?: 'all' | 'admin' | 'token';
  tokens?: string[];
}

export default Config;
