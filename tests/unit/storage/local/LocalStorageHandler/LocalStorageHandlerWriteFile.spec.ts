import fs from 'fs/promises';
import { LocalStorageHandler } from '@/storage/local/LocalStorageHandler';
import { exists, isFile } from '@/storage/local/LocalStorageHandlerHelper';
import mockFS from 'mock-fs';
import { DirectoryDoesNotExistError } from '@/errors/DirectoryDoesNotExistError';
import { IsNotDirectoryError } from '@/errors/IsNotDirectoryError';

const handler = new LocalStorageHandler('/base');

describe('LocalStorageHandler->writeFile', (): void => {
  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  test('creates new file.', async (): Promise<void> => {
    mockFS({ '/base': {} });

    await handler.writeFile('/test.txt', 'some text', 'utf8');

    expect(await exists('/base/test.txt')).toBe(true);
    expect(await isFile('/base/test.txt')).toBe(true);
    expect(await fs.readFile('/base/test.txt', 'utf8')).toBe('some text');
  });

  test('overwrites existing file.', async (): Promise<void> => {
    mockFS({
      '/base/test.txt': 'old text'
    });

    await handler.writeFile('/test.txt', 'new text', 'utf8');

    expect(await exists('/base/test.txt')).toBe(true);
    expect(await isFile('/base/test.txt')).toBe(true);
    expect(await fs.readFile('/base/test.txt', 'utf8')).toBe('new text');
  });

  test('throws error if target directory does not exist.', async (): Promise<void> => {
    mockFS({ '/base': {} });
    let error: Error | null = null;

    try {
      await handler.writeFile('/nope/test.txt', 'some text', 'utf8');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(DirectoryDoesNotExistError);
    expect(error?.message).toBe('Directory /nope does not exist.');
  });

  test('throws error if target is not a directory.', async (): Promise<void> => {
    mockFS({
      '/base': {
        test: ''
      }
    });
    let error: Error | null = null;

    try {
      await handler.writeFile('/test/test.txt', 'some text', 'utf8');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(IsNotDirectoryError);
    expect(error?.message).toBe('/test is not a directory.');
  });
});
