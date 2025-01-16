import mockFS from 'mock-fs';
import { getConfig, getFullConfig, loadConfig, setEnvPrefix } from '@/config/config';
import process from 'process';

describe('config', (): void => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterEach(async (): Promise<void> => {
    mockFS.restore();
    process.env = OLD_ENV;
    setEnvPrefix('FILES_CRUD')
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
    process.env.FILES_CRUD_DIRECTORY_PERMISSIONS__DIRECTORIES = 'special/world,special/admins';
    process.env.FILES_CRUD_DIRECTORY_PERMISSIONS__PERMISSIONS = 'fff,000';

    loadConfig();

    expect(getConfig()).toEqual({
      directoryPermissions: {
        'special/world': 'fff',
        'special/admins': '000'
      }
    });
  });

  test('loads correctly based on environment-variables, directoryPermissions, for each', async (): Promise<void> => {
    process.env.FILES_CRUD_DIRECTORY_PERMISSIONS__SOME_DIR = '001';
    process.env.FILES_CRUD_DIRECTORY_PERMISSIONS__SOME_OTHER_DIR = '009';

    loadConfig();

    expect(getConfig()).toEqual({
      directoryPermissions: {
        someDir: '001',
        someOtherDir: '009'
      }
    });
  });

  test('defaults correctly, empty file', async (): Promise<void> => {
    mockFS({ './config.json': '{}' });

    loadConfig();

    expect(getFullConfig().database).toEqual({ name: 'in-memory' });
    expect(getFullConfig().server).toEqual({ host: '127.0.0.1', port: 9000, noRobots: false, fileSizeLimit: '100m', useHttps: false, cors: {} });
  });

  test('defaults correctly, file with few properties', async (): Promise<void> => {
    mockFS({ './config.json': '{"server":{"useHttps":true}}' });

    loadConfig();

    expect(getFullConfig().database).toEqual({ name: 'in-memory' });
    expect(getFullConfig().server).toEqual({
      host: '127.0.0.1',
      port: 9000,
      noRobots: false,
      fileSizeLimit: '100m',
      useHttps: true,
      cors: {},
      useHttp2: false,
      hsts: true,
      sslKeyPath: './privateKey.pem',
      sslCertPath: './certificate.pem'
    });
  });
});
