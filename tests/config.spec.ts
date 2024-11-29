import mockFS from 'mock-fs';
import { getConfig, loadConfig } from '@/config';

describe('config', (): void => {
  afterEach(async (): Promise<void> => {
    mockFS.restore();
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

  test('loads simple in-memory-db conf correctly', async (): Promise<void> => {
    mockFS({ './config.json': '{"database":{"name":"in-memory"}}' });

    loadConfig();

    expect(getConfig()).toEqual({ database: { name: 'in-memory' } });
  });

  test('loads simple mongodb conf correctly', async (): Promise<void> => {
    mockFS({ './config.json': '{"database":{"name":"mongodb", "url":"mongodb://localhost:27017"}}' });

    loadConfig();

    expect(getConfig()).toEqual({ database: { name: 'mongodb', url: 'mongodb://localhost:27017' } });
  });
});
