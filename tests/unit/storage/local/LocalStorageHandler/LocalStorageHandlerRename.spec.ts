import { LocalStorageHandler } from '@/storage/local/LocalStorageHandler';
import mockFS from 'mock-fs';
import { exists, isFile, isDirectory } from '@/storage/local/LocalStorageHandlerHelper';
import { DoesNotExistError } from '@/errors/DoesNotExistError';
import { AlreadyExistsError } from '@/errors/AlreadyExistsError';

const handler = new LocalStorageHandler('/base');

describe('LocalStorageHandler->rename', (): void => {
  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  test('renames file.', async (): Promise<void> => {
    mockFS({
      '/base/test.txt': 'some text'
    });

    await handler.rename('/test.txt', 'interests.txt');

    expect(await isFile('/base/interests.txt')).toBe(true);
    expect(await exists('/base/test.txt')).toBe(false);
  });

  test('renames directory.', async (): Promise<void> => {
    mockFS({
      '/base': {
        dir1: {}
      }
    });

    await handler.rename('/dir1', 'interests');

    expect(await isDirectory('/base/interests')).toBe(true);
    expect(await exists('/base/dir1')).toBe(false);
  });

  test('throws error if source does not exist.', async (): Promise<void> => {
    mockFS({ '/base': {} });
    let error: Error | null = null;

    try {
      await handler.rename('/test.txt', 'newName');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(DoesNotExistError);
    expect(error?.message).toBe('/test.txt does not exist.');
  });

  test('throws error if target already exists.', async (): Promise<void> => {
    mockFS({
      '/base': {
        file1: '',
        file2: ''
      }
    });
    let error: Error | null = null;

    try {
      await handler.rename('/file1', '/file2');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(AlreadyExistsError);
    expect(error?.message).toBe('/file2 already exists.');
  });
});
