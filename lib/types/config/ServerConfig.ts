import { CorsConfig } from '@/types/config/CorsConfig';

interface ServerConfig {
  host?: string;
  port?: number;
  useHttps?: boolean;
  useHttp2?: boolean;
  sslKeyPath?: string;
  sslCertPath?: string;
  hsts?: boolean;
  noRobots?: boolean;
  cors?: CorsConfig;
  fileSizeLimit?: string | number;
}

export { ServerConfig };
