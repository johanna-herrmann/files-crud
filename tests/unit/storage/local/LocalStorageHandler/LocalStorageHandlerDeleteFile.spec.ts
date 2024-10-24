import { LocalStorageHandler } from '@/storage/local/LocalStorageHandler';
import { exists, isFile } from '@/storage/local/LocalStorageHandlerHelper';
import mockFS from 'mock-fs';
import { FileDoesNotExistError } from '@/errors/FileDoesNotExistError';
import { IsNotFileError } from '@/errors/IsNotFileError';

const handler = new LocalStorageHandler('/base');

describe('LocalStorageHandler->deleteFile', (): void => {
  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  const testDir = {
    '/base': {
      dir1: {
        file: 'content',
        file2: 'existing'
      }
    }
  };

  test('deletes file if it exists.', async (): Promise<void> => {
    mockFS(testDir);

    await handler.deleteFile('dir1/file');

    expect(await isFile('/base/dir1/file2')).toBe(true);
    expect(await exists('/base/dir1/file')).toBe(false);
  });

  test('throws error if file does not exist.', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.deleteFile('/dir1/file3');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(FileDoesNotExistError);
    expect(error?.message).toBe('File /dir1/file3 does not exist.');
  });

  test('throws error if path is not a file.', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.deleteFile('/dir1');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(IsNotFileError);
    expect(error?.message).toBe('/dir1 is not a file.');
  });
});
