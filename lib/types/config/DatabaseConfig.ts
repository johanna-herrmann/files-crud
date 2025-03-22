interface DatabaseConfig {
  name?: 'mongodb' | 'postgresql' | 'in-memory';
  db?: string;
  url?: string;
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
}

export { DatabaseConfig };
