import { DirectoryDoesNotExistError } from '@/errors/DirectoryDoesNotExistError';
import { DirectoryIsNotEmptyError } from '@/errors/DirectoryIsNotEmptyError';
import { IsNotDirectoryError } from '@/errors/IsNotDirectoryError';
import { LocalStorageHandler } from '@/storage/local/LocalStorageHandler';
import { exists, isDirectory } from '@/storage/local/LocalStorageHandlerHelper';
import mockFS from 'mock-fs';

const handler = new LocalStorageHandler('/base');

describe('LocalStorageHandler->deleteDirectory', (): void => {
  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  const testDir = {
    '/base': {
      dir1: {
        file: 'content',
        file2: 'existing',
        subDir: {
          fileInSub1: '',
          fileInSub2: '',
          emptyDirInSub1: {},
          emptyDirInSub2: {}
        }
      },
      dir2: {}
    }
  };

  test('deletes empty Directory.', async (): Promise<void> => {
    mockFS(testDir);

    await handler.deleteDirectory('dir1/subDir/emptyDirInSub1');

    expect(await isDirectory('/base/dir1/subDir/emptyDirInSub2')).toBe(true);
    expect(await exists('/base/dir1/subDir/emptyDirInSub1')).toBe(false);
  });

  test('deletes non-empty Directory.', async (): Promise<void> => {
    mockFS(testDir);

    await handler.deleteDirectory('dir1', true);

    expect(await isDirectory('/base/dir2')).toBe(true);
    expect(await exists('/base/dir1')).toBe(false);
  });

  test('throws error if directory does not exist.', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.deleteDirectory('/dir3');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(DirectoryDoesNotExistError);
    expect(error?.message).toBe('Directory /dir3 does not exist.');
  });

  test('throws error if path is not a directory.', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.deleteDirectory('/dir1/file');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(IsNotDirectoryError);
    expect(error?.message).toBe('/dir1/file is not a directory.');
  });

  test('throws error if directory is not empty.', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.deleteDirectory('/dir1');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(DirectoryIsNotEmptyError);
    expect(error?.message).toBe('Directory /dir1 is not empty, so deletion must be forced.');
  });
});
