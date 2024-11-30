import DatabaseConfig from './DatabaseConfig';

interface Config {
  database?: DatabaseConfig;
  accessKeyId?: string;
  secretAccessKey?: string;
  register?: 'all' | 'admin' | 'token';
  tokens?: string[];
}

export default Config;
