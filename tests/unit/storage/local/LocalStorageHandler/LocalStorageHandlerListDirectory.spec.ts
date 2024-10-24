import { LocalStorageHandler } from '@/storage/local/LocalStorageHandler';
import mockFS from 'mock-fs';
import { DirectoryDoesNotExistError } from '@/errors/DirectoryDoesNotExistError';
import { IsNotDirectoryError } from '@/errors/IsNotDirectoryError';

const handler = new LocalStorageHandler('/base');

describe('LocalStorageHandler->listDirectory', (): void => {
  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  const testDir = {
    '/base/test': {
      'test.txt': '',
      '.hidden.sys': '',
      empty: {},
      '.empty_hidden': {}
    }
  };

  test('returns content of directory without hidden files/directories.', async (): Promise<void> => {
    mockFS(testDir);

    const contents = await handler.listDirectory('/test');

    expect(contents.length).toBe(2);
    expect(contents[0]).toBe('empty/');
    expect(contents[1]).toBe('test.txt');
  });

  test('returns content of directory with hidden files/directories.', async (): Promise<void> => {
    mockFS(testDir);

    const contents = await handler.listDirectory('/test', true);

    expect(contents.length).toBe(4);
    expect(contents[0]).toBe('.empty_hidden/');
    expect(contents[1]).toBe('empty/');
    expect(contents[2]).toBe('.hidden.sys');
    expect(contents[3]).toBe('test.txt');
  });

  test('throws error if directory does not exist.', async (): Promise<void> => {
    mockFS({ '/base': {} });

    let error: Error | null = null;

    try {
      await handler.listDirectory('/test');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(DirectoryDoesNotExistError);
    expect(error?.message).toBe('Directory /test does not exist.');
  });

  test('throws error if path is not a directory.', async (): Promise<void> => {
    mockFS({ '/base/test': '' });

    let error: Error | null = null;

    try {
      await handler.listDirectory('/test');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(IsNotDirectoryError);
    expect(error?.message).toBe('/test is not a directory.');
  });
});
