import mockFS from 'mock-fs';
import process from 'process';
import { getConfig, getFullConfig, loadConfig, reloadConfig, setEnvPrefix, NEW_CONFIG_FILE_PATH } from '@/config/config';
import { exists } from '#/utils';

describe('config', (): void => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterEach(async (): Promise<void> => {
    mockFS.restore();
    process.env = OLD_ENV;
    setEnvPrefix('FILES_CRUD');
  });

  test('loads missing file correctly', async (): Promise<void> => {
    mockFS({});

    loadConfig();

    expect(getConfig()).toEqual({});
  });

  test('loads empty file correctly', async (): Promise<void> => {
    mockFS({ './config.json': '' });

    loadConfig();

    expect(getConfig()).toEqual({});
  });

  test('loads empty object correctly', async (): Promise<void> => {
    mockFS({ './config.json': '{}' });

    loadConfig();

    expect(getConfig()).toEqual({});
  });

  test('loads simple in-memory-db conf correctly, json', async (): Promise<void> => {
    mockFS({ './config.json': '{"database":{"name":"in-memory"}}' });

    loadConfig();

    expect(getConfig()).toEqual({ database: { name: 'in-memory' } });
  });

  test('loads simple in-memory-db conf correctly, yaml', async (): Promise<void> => {
    mockFS({ './config.yaml': 'database:\n  name: in-memory' });

    loadConfig();

    expect(getConfig()).toEqual({ database: { name: 'in-memory' } });
  });

  test('loads simple in-memory-db conf correctly, yml', async (): Promise<void> => {
    mockFS({ './config.yml': 'database:\n  name: in-memory' });

    loadConfig();

    expect(getConfig()).toEqual({ database: { name: 'in-memory' } });
  });

  test('loads simple mongodb conf correctly', async (): Promise<void> => {
    mockFS({ './config.json': '{"database":{"name":"mongodb", "url":"mongodb://localhost:27017"}}' });

    loadConfig();

    expect(getConfig()).toEqual({ database: { name: 'mongodb', url: 'mongodb://localhost:27017' } });
  });

  test('overwrites correctly based on environment-variables', async (): Promise<void> => {
    mockFS({ './config.json': '{"database":{"name":"mongodb", "url":"mongodb://localhost:27017"}, "server":{"host":"127.0.0.1","port":9000}}' });
    process.env.FILES_CRUD_LOGGING__IP_LOGGING = 'none';
    process.env.FILES_CRUD_DATABASE__URL = 'mongodb://localhost:12345';
    process.env.FILES_CRUD_SERVER__HOST = '0.0.0.0';
    process.env.FILES_CRUD_SERVER__USE_HTTPS = 'true';
    process.env.FILES_CRUD_TOKENS = 't1,t2';
    process.env.FILES_CRUD_DEFAULT_PERMISSIONS = '001';

    loadConfig();

    expect(getConfig()).toEqual({
      logging: { ipLogging: 'none' },
      database: { name: 'mongodb', url: 'mongodb://localhost:12345' },
      server: { host: '0.0.0.0', port: 9000, useHttps: true },
      tokens: ['t1', 't2'],
      defaultPermissions: '001'
    });
  });

  test('overwrites correctly based on environment-variables, specific prefix', async (): Promise<void> => {
    mockFS({ './config.json': '{"database":{"name":"mongodb", "url":"mongodb://localhost:27017"}}' });
    setEnvPrefix('PREF');
    process.env.PREF_LOGGING__IP_LOGGING = 'none';
    process.env.PREF_DATABASE__URL = 'mongodb://localhost:12345';

    loadConfig();

    expect(getConfig()).toEqual({
      logging: { ipLogging: 'none' },
      database: { name: 'mongodb', url: 'mongodb://localhost:12345' }
    });
  });

  test('loads correctly based on environment-variables, no defaultPermissions', async (): Promise<void> => {
    loadConfig();

    expect(getConfig()).toEqual({});
  });

  test('loads correctly based on environment-variables, directoryPermissions, explicit object', async (): Promise<void> => {
    process.env.FILES_CRUD_DIRECTORY_PERMISSIONS = '{"special/world":"fff", "special/admins":"000"}';

    loadConfig();

    expect(getConfig()).toEqual({
      directoryPermissions: {
        'special/world': 'fff',
        'special/admins': '000'
      }
    });
  });

  test('loads correctly based on environment-variables, directoryPermissions, separated', async (): Promise<void> => {
    process.env.FILES_CRUD_DIRECTORY_PERMISSIONS__DIRECTORIES = 'special/world,special/admins,special/all-cr';
    process.env.FILES_CRUD_DIRECTORY_PERMISSIONS__PERMISSIONS = 'fff,000,create-read:create-read:create-read';

    loadConfig();

    expect(getConfig()).toEqual({
      directoryPermissions: {
        'special/world': 'fff',
        'special/admins': '000',
        'special/all-cr': ['create-read', 'create-read', 'create-read']
      }
    });
  });

  test('loads correctly based on environment-variables, directoryPermissions, for each', async (): Promise<void> => {
    process.env.FILES_CRUD_DIRECTORY_PERMISSIONS__SOME_DIR = '001';
    process.env.FILES_CRUD_DIRECTORY_PERMISSIONS__SOME_OTHER_DIR = 'create-read,read,read';

    loadConfig();

    expect(getConfig()).toEqual({
      directoryPermissions: {
        someDir: '001',
        someOtherDir: ['create-read', 'read', 'read']
      }
    });
  });

  test('defaults correctly, empty file', async (): Promise<void> => {
    mockFS({ './config.json': '{}' });

    loadConfig();

    const { database, storage, logging, server, ...rest } = getFullConfig();
    expect(database).toEqual({ name: 'in-memory' });
    expect(storage).toEqual({ name: 'fs', path: './' });
    expect(logging).toEqual({
      accessLogFile: './access.log',
      accessLoggingFormat: 'json',
      enableAccessLogging: true,
      enableErrorFileLogging: true,
      enableLogFileRotation: true,
      errorFileLoggingFormat: 'json',
      errorLogFile: './error.log',
      fileLoggingFormat: 'json',
      ipLogging: 'anonymous',
      level: 'info',
      logFileRotationEnableCompression: true,
      logFileRotationFrequencyUnit: 'd',
      logFileRotationMaxFiles: '14d',
      ttyLoggingFormat: 'coloredHumanReadableLine'
    });
    expect(server).toEqual({
      host: '0.0.0.0',
      port: 9000,
      noRobots: false,
      fileSizeLimit: '100m',
      useHttps: false,
      cors: undefined
    });
    expect(rest).toEqual({
      register: 'admin',
      directoryPermissions: {},
      defaultPermissions: 'crudcr------',
      publicFileOwner: 'all',
      tokenExpiresInSeconds: 1_800
    });
  });

  test('defaults correctly, file with few properties', async (): Promise<void> => {
    mockFS({ './config.json': '{"server":{"useHttps":true},"database":{"name":"dynamodb"}}' });

    loadConfig();

    expect(getFullConfig().database?.name).toBe('dynamodb');
    expect(getFullConfig().server).toEqual({
      host: '0.0.0.0',
      port: 9000,
      noRobots: false,
      fileSizeLimit: '100m',
      useHttps: true,
      cors: undefined,
      useHttp2: false,
      hsts: true,
      sslKeyPath: './privateKey.pem',
      sslCertPath: './certificate.pem'
    });
  });

  test('fails on invalid', async (): Promise<void> => {
    let error: unknown = null;
    process.env.FILES_CRUD_GARBAGE = '';

    try {
      loadConfig();
    } catch (ex: unknown) {
      error = ex;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Invalid Config. ValidationError: "garbage" is not allowed');
  });

  test('fails on invalid, deep, out of range', async (): Promise<void> => {
    let error: unknown = null;
    process.env.FILES_CRUD_SERVER__PORT = '98765';

    try {
      loadConfig();
    } catch (ex: unknown) {
      error = ex;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Invalid Config. ValidationError: "server.port" must be less than or equal to 65536');
  });

  test('fails on invalid, deep, not matching enum', async (): Promise<void> => {
    let error: unknown = null;
    process.env.FILES_CRUD_STORAGE__NAME = 'fantasy_storage';

    try {
      loadConfig();
    } catch (ex: unknown) {
      error = ex;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Invalid Config. ValidationError: "storage.name" must be one of [fs, s3]');
  });

  test('fails on invalid, deep, wrong size type', async (): Promise<void> => {
    let error: unknown = null;
    process.env.FILES_CRUD_SERVER__FILE_SIZE_LIMIT = 'k23';

    try {
      loadConfig();
    } catch (ex: unknown) {
      error = ex;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      'Invalid Config. ValidationError: "server.fileSizeLimit" with value "k23" fails to match the required pattern: /^\\d+[kmgtpe]$/iu'
    );
  });

  test('fails on invalid, deeper, wrong type', async (): Promise<void> => {
    let error: unknown = null;
    process.env.FILES_CRUD_SERVER__CORS__ORIGIN = '123';

    try {
      loadConfig();
    } catch (ex: unknown) {
      error = ex;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Invalid Config. ValidationError: "server.cors.origin" must be one of [string, array]');
  });

  test('reloadConfig reloads config correctly.', async (): Promise<void> => {
    const newConfig = { register: 'all', server: { port: 1234 } };
    loadConfig();
    mockFS({ [NEW_CONFIG_FILE_PATH]: JSON.stringify(newConfig) });

    await reloadConfig();

    expect(getConfig()).toEqual(newConfig);
    expect(await exists(NEW_CONFIG_FILE_PATH)).toBe(false);
  });
});
