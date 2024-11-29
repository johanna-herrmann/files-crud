import DatabaseConfig from './DatabaseConfig';

interface Config {
  database?: DatabaseConfig;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export default Config;
