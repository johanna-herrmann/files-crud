import Config from '@/types/config/Config';
import PermissionConfig from '@/types/config/PermissionConfig';
import DatabaseConfig from '@/types/config/DatabaseConfig';
import StorageConfig from '@/types/config/StorageConfig';
import LoggingConfig from '@/types/config/LoggingConfig';
import ServerConfig from '@/types/config/ServerConfig';

const FILE_SIZE_LIMIT = '100m'; // 100 MiB;

const loadDbConfig = function (config: Config): DatabaseConfig {
  const dynamodbConfig: Partial<DatabaseConfig> = {
    region: config.database?.region ?? config.region ?? 'eu-central-1',
    accessKeyId: config.database?.accessKeyId ?? config.accessKeyId ?? 'fallback-key',
    secretAccessKey: config.database?.secretAccessKey ?? config.secretAccessKey ?? 'fallback-secret',
    dynamoTableNames: config.database?.dynamoTableNames ?? {
      user: 'files-crud-user',
      failedLoginAttempts: 'files-crud-failedloginattempts',
      jwtKey: 'files-crud-jwtkey'
    }
  };

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
  if (config.database?.name === 'dynamodb') {
    return {
      name: 'in-memory',
      ...dynamodbConfig
    };
  }
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
  const conf = { name: config.storage?.name ?? 'fs' };
  if (conf.name === 'fs') {
    return {
      ...conf,
      path: config.storage?.path ?? config.path ?? './'
    };
  }
  return {
    ...conf,
    region: config.storage?.region || config.region || 'eu-central-1',
    accessKeyId: config.storage?.accessKeyId || config.accessKeyId || 'fallback-key',
    secretAccessKey: config.storage?.secretAccessKey || config.secretAccessKey || 'fallback-secret',
    bucket: config.storage?.bucket ?? 'files-crud',
    endpoint: config.storage?.endpoint,
    forcePathStyle: config.storage?.forcePathStyle ?? false
  };
};

const loadLoggingConfig = function (config: Config) {
  let conf: LoggingConfig = {
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
    host: config.server?.host ?? '127.0.0.1',
    port: config.server?.port ?? 9000,
    useHttps: config.server?.useHttps ?? false,
    noRobots: config.server?.noRobots ?? false,
    cors: config.server?.cors ?? {},
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

const defaultDirConf = {
  public: {},
  user: { create: true, read: true, update: true, delete: true },
  admin: { create: true, read: true, update: true, delete: true }
};

const loadDefaultPermissions = function (config: Config): PermissionConfig {
  if (!config.defaultPermissions) {
    return defaultDirConf;
  }
  return { ...defaultDirConf, ...config.defaultPermissions };
};

const loadDirectoryPermissions = function (config: Config): Record<string, PermissionConfig> {
  return config.directoryPermissions ?? {};
};

const loadUserDirectoryPermissions = function (config: Config): PermissionConfig {
  const defaultConf = {
    public: {},
    user: {},
    owner: { create: true, read: true, update: true, delete: true },
    admin: { create: true, read: true, update: true, delete: true }
  };
  if (!config.userDirectoryPermissions) {
    return {};
  }
  return { ...defaultConf, ...config.userDirectoryPermissions };
};

const loadUserFilePermissions = function (config: Config): PermissionConfig {
  const defaultConf = {
    public: {},
    user: { read: true },
    owner: { read: true, update: true, delete: true },
    admin: { read: true, update: true, delete: true }
  };
  if (!config.userFilePermissions) {
    return {};
  }
  return { ...defaultConf, ...config.userFilePermissions };
};

const loadFullConfig = function (config: Config): Config {
  const register = config.register ?? 'admin';

  return {
    database: loadDbConfig(config),
    storage: loadStorageConfig(config),
    logging: loadLoggingConfig(config),
    path: config.path ?? './',
    accessKeyId: config.database?.name === 'dynamodb' || config.storage?.name === 's3' ? (config.accessKeyId ?? 'fallback-key') : undefined,
    secretAccessKey:
      config.database?.name === 'dynamodb' || config.storage?.name === 's3' ? (config.secretAccessKey ?? 'fallback-secret') : undefined,
    region: config.database?.name === 'dynamodb' || config.storage?.name === 's3' ? (config.region ?? 'eu-central') : undefined,
    register,
    tokens: register === 'token' ? (config.tokens ?? []) : undefined,
    directoryPermissions: loadDirectoryPermissions(config),
    userDirectoryPermissions: loadUserDirectoryPermissions(config),
    userFilePermissions: loadUserFilePermissions(config),
    defaultPermissions: loadDefaultPermissions(config),
    server: loadServerConfig(config),
    webRoot: config.webRoot
  };
};

export { loadFullConfig };
