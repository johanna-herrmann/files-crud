import joi from 'joi';

const buildConfigSchema = function (directoryPermissionsKey: string[]): joi.ObjectSchema<unknown> {
  const directoryPermissionsSchema: Record<string, (joi.StringSchema | joi.ArraySchema<unknown[]>)[]> = {};
  directoryPermissionsKey.forEach((key) => {
    directoryPermissionsSchema[key] = [joi.string(), joi.array().items(joi.string())];
  });

  return joi.object({
    database: joi.object({
      name: joi.alternatives('in-memory', 'mongodb', 'postgresql', 'dynamodb'),
      db: joi.string(),
      url: joi.string(),
      host: joi.string(),
      port: joi.number().integer().min(1).max(65536),
      user: joi.string(),
      pass: joi.string(),
      region: joi.string(),
      accessKeyId: joi.string(),
      secretAccessKey: joi.string(),
      userTableName: joi.string().regex(/^[a-z0-9_-]+$/iu),
      failedLoginAttemptsTableName: joi.string().regex(/^[a-z0-9_-]+$/iu),
      jwtKeyTableName: joi.string().regex(/^[a-z0-9_-]+$/iu)
    }),
    storage: joi.object({
      name: joi.alternatives('fs', 's3'),
      path: joi.string(),
      region: joi.string(),
      accessKeyId: joi.string(),
      secretAccessKey: joi.string(),
      bucket: joi.string().regex(/^[a-z0-9_-]+$/iu),
      endpoint: joi.string(),
      forcePathStyle: joi.boolean()
    }),
    logging: joi.object({
      level: joi.alternatives('debug', 'info', 'warn', 'error'),
      accessLogFile: joi.string(),
      errorLogFile: joi.string(),
      ttyLoggingFormat: joi.alternatives('humanReadableLine', 'coloredHumanReadableLine', 'humanReadableBlock', 'coloredHumanReadableBlock', 'json'),
      fileLoggingFormat: joi.alternatives('humanReadableLine', 'coloredHumanReadableLine', 'humanReadableBlock', 'coloredHumanReadableBlock', 'json'),
      errorFileLoggingFormat: joi.alternatives(
        'humanReadableLine',
        'coloredHumanReadableLine',
        'humanReadableBlock',
        'coloredHumanReadableBlock',
        'json'
      ),
      accessLoggingFormat: joi.alternatives('classic', 'json'),
      enableErrorFileLogging: joi.boolean(),
      enableAccessLogging: joi.boolean(),
      enableLogFileRotation: joi.boolean(),
      logFileRotationFrequencyUnit: joi.string().regex(/^[smhd]$/iu),
      logFileRotationMaxFiles: joi.string().regex(/^\d+[smhd]$/iu),
      logFileRotationEnableCompression: joi.boolean(),
      ipLogging: joi.string().regex(/^(full|anonymous|none)$/iu)
    }),
    server: joi.object({
      host: joi.string(),
      port: joi.number().integer().min(1).max(65536),
      useHttps: joi.boolean(),
      useHttp2: joi.boolean(),
      sslKeyPath: joi.string(),
      sslCertPath: joi.string(),
      hsts: joi.boolean(),
      noRobots: joi.boolean(),
      cors: joi.object({
        origin: joi.alternatives(joi.string(), joi.array().items(joi.string())),
        methods: joi.alternatives(joi.string(), joi.array().items(joi.string())),
        allowedHeaders: joi.alternatives(joi.string(), joi.array().items(joi.string())),
        exposedHeaders: joi.alternatives(joi.string(), joi.array().items(joi.string())),
        credentials: joi.boolean(),
        maxAge: joi.number()
      }),
      fileSizeLimit: joi.alternatives(joi.number().integer().min(0), joi.string().regex(/^\d+[kmgtpe]$/iu))
    }),
    accessKeyId: joi.string(),
    secretAccessKey: joi.string(),
    region: joi.string(),
    register: joi.string().regex(/^(all|admin|token)$/iu),
    tokens: joi.array().items(joi.string()),
    directoryPermissions: joi.object(directoryPermissionsSchema),
    defaultPermissions: [joi.string(), joi.array().items(joi.string())],
    publicFileOwner: joi.string().regex(/^(all|none)$/iu),
    tokenExpiresInSeconds: joi.number().integer().min(0),
    webRoot: joi.string()
  });
};

export { buildConfigSchema };
