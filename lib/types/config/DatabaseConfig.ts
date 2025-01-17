interface DatabaseConfig {
  name: 'mongodb' | 'postgresql' | 'dynamodb' | 'in-memory';
  db?: string;
  url?: string;
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  password?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  dynamoTableNames?: {
    user: string;
    failedLoginAttempts: string;
    jwtKey: string;
  };
}

export default DatabaseConfig;
