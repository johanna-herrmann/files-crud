import { Config } from '@/types/config/Config';
import { DatabaseConfig } from '@/types/config/DatabaseConfig';
import { StorageConfig } from '@/types/config/StorageConfig';
import { LoggingConfig } from '@/types/config/LoggingConfig';
import { ServerConfig } from '@/types/config/ServerConfig';

const FILE_SIZE_LIMIT = '100m'; // 100 MiB;

const loadDbConfig = function (config: Config): DatabaseConfig {
  const mongodbConfig: Partial<DatabaseConfig> = {
    url: config.database?.url ?? 'mongodb://localhost:27017/files-crud',
    user: config.database?.user,
    pass: config.database?.pass
  };

  const postgresqlConfig: Partial<DatabaseConfig> = {
    host: config.database?.host ?? 'localhost',
    port: config.database?.port ?? 5432,
    db: config.database?.db ?? 'files-crud',
    user: config.database?.user,
    pass: config.database?.pass
  };

  if (config.database?.name === 'postgresql') {
    return {
      name: 'postgresql',
      ...postgresqlConfig
    };
  }
  if (config.database?.name === 'mongodb') {
    return {
      name: 'mongodb',
      ...mongodbConfig
    };
  }
  return { name: 'in-memory' };
};

const loadStorageConfig = function (config: Config): StorageConfig {
  const conf = {
    name: config.storage?.name || 'fs',
    path: config.storage?.path || './'
  };
  if (conf.name === 'fs') {
    return conf;
  }
  return {
    ...conf,
    region: config.storage?.region || 'eu-central-1',
    accessKeyId: config.storage?.accessKeyId || 'fallback-key',
    secretAccessKey: config.storage?.secretAccessKey || 'fallback-secret',
    bucket: config.storage?.bucket ?? 'files-crud',
    endpoint: config.storage?.endpoint,
    forcePathStyle: config.storage?.forcePathStyle ?? false
  };
};

const loadLoggingConfig = function (config: Config) {
  let conf: LoggingConfig = {
    level: config.logging?.level || 'info',
    ipLogging: config.logging?.ipLogging ?? 'anonymous',
    ttyLoggingFormat: config.logging?.ttyLoggingFormat ?? 'coloredHumanReadableLine',
    enableAccessLogging: config.logging?.enableAccessLogging ?? true,
    enableErrorFileLogging: config.logging?.enableErrorFileLogging ?? true,
    fileLoggingFormat: config.logging?.fileLoggingFormat ?? 'json'
  };
  if (conf.enableAccessLogging) {
    conf = {
      ...conf,
      accessLogFile: config.logging?.accessLogFile ?? './access.log',
      accessLoggingFormat: config.logging?.accessLoggingFormat ?? 'json',
      enableLogFileRotation: config.logging?.enableLogFileRotation ?? true
    };
  }
  if (conf.enableErrorFileLogging) {
    conf = {
      ...conf,
      errorFileLoggingFormat: config.logging?.errorFileLoggingFormat ?? 'json',
      errorLogFile: config.logging?.errorLogFile ?? './error.log',
      enableLogFileRotation: config.logging?.enableLogFileRotation ?? true
    };
  }
  if (conf.enableLogFileRotation) {
    conf = {
      ...conf,
      logFileRotationFrequencyUnit: config.logging?.logFileRotationFrequencyUnit ?? 'd',
      logFileRotationMaxFiles: config.logging?.logFileRotationMaxFiles ?? '14d',
      logFileRotationEnableCompression: config.logging?.logFileRotationEnableCompression ?? true
    };
  }
  return conf;
};

const loadServerConfig = function (config: Config) {
  let conf: ServerConfig = {
    host: config.server?.host ?? '0.0.0.0',
    port: config.server?.port ?? 9000,
    useHttps: config.server?.useHttps ?? false,
    noRobots: config.server?.noRobots ?? false,
    cors: config.server?.cors,
    fileSizeLimit: config.server?.fileSizeLimit ?? FILE_SIZE_LIMIT
  };
  if (conf.useHttps) {
    conf = {
      ...conf,
      useHttp2: config.server?.useHttp2 ?? false,
      hsts: config.server?.hsts ?? true,
      sslKeyPath: config.server?.sslKeyPath ?? './privateKey.pem',
      sslCertPath: config.server?.sslCertPath ?? './certificate.pem'
    };
  }
  return conf;
};

const loadDirectoryPermissions = function (config: Config): Record<string, string | string[]> {
  return config.directoryPermissions ?? {};
};

const loadFullConfig = function (config: Config): Config {
  const register = config.register ?? 'admin';

  // noinspection SpellCheckingInspection
  return {
    database: loadDbConfig(config),
    storage: loadStorageConfig(config),
    logging: loadLoggingConfig(config),
    register,
    tokens: register === 'token' ? (config.tokens ?? []) : undefined,
    directoryPermissions: loadDirectoryPermissions(config),
    defaultPermissions: config.defaultPermissions ?? 'crudcr------',
    publicFileOwner: config.publicFileOwner ?? 'all',
    server: loadServerConfig(config),
    tokenExpiresInSeconds: config.tokenExpiresInSeconds ?? 1_800,
    webRoot: config.webRoot
  };
};

export { loadFullConfig };
