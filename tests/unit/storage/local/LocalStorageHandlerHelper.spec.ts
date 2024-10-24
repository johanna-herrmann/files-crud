import { exists, isFile, isDirectory } from '@/storage/local/LocalStorageHandlerHelper';
import mockFS from 'mock-fs';

describe('LocalStorageHandlerHelper', (): void => {
  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  describe('exists', (): void => {
    test('returns true if item exists.', async (): Promise<void> => {
      mockFS({ '/item': '' });

      const result = await exists('/item');

      expect(result).toBe(true);
    });

    test('returns false if item does not exist.', async (): Promise<void> => {
      mockFS({});

      const result = await exists('/item');

      expect(result).toBe(false);
    });
  });

  describe('isFile', (): void => {
    test('returns true if item is a file.', async (): Promise<void> => {
      mockFS({ '/item': '' });

      const result = await isFile('/item');

      expect(result).toBe(true);
    });

    test('returns false if item is not a file.', async (): Promise<void> => {
      mockFS({ '/item': {} });

      const result = await isFile('/item');

      expect(result).toBe(false);
    });
  });

  describe('isDirectory', (): void => {
    test('returns true if item is a directory.', async (): Promise<void> => {
      mockFS({ '/item': {} });

      const result = await isDirectory('/item');

      expect(result).toBe(true);
    });

    test('returns false if item is not a directory.', async (): Promise<void> => {
      mockFS({ '/item': '' });

      const result = await isDirectory('/item');

      expect(result).toBe(false);
    });
  });
});
