import { loadStorage, resetStorage } from '@/storage';
import mockFS from 'mock-fs';
import { loadConfig } from '@/config';
import paths from 'path';

describe('storage', (): void => {
  afterEach(async (): Promise<void> => {
    mockFS.restore();
    resetStorage();
  });

  test('loadStorage loads storage correctly', async (): Promise<void> => {
    loadConfig();

    const storage = loadStorage();

    expect(storage.getConf()[1]).toBe(paths.resolve('./'));
  });
});
