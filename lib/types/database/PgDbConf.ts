interface PgDbConf {
  host: string;
  port: number;
  database: string;
  user?: string;
  password?: string;
}

export default PgDbConf;
