interface DatabaseConfig {
  name: 'mongodb' | 'postgresql' | 'dynamodb' | 'in-memory';
  db?: string;
  url?: string;
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  userTableName?: string;
  failedLoginAttemptsTableName?: string;
  jwtKeyTableName?: string;
}

export { DatabaseConfig };
