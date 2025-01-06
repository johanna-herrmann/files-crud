import mockFS from 'mock-fs';
import { getConfig, loadConfig } from '@/config';
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

    loadConfig();

    expect(getConfig()).toEqual({
      logging: { ipLogging: 'none' },
      database: { name: 'mongodb', url: 'mongodb://localhost:12345' },
      server: { host: '0.0.0.0', port: 9000, useHttps: true }
    });
  });
});
