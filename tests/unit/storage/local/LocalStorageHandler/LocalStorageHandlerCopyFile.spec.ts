import fs from 'fs/promises';
import { LocalStorageHandler } from '@/storage/local/LocalStorageHandler';
import { isDirectory, isFile } from '@/storage/local/LocalStorageHandlerHelper';
import mockFS from 'mock-fs';
import { FileDoesNotExistError } from '@/errors/FileDoesNotExistError';
import { DirectoryDoesNotExistError } from '@/errors/DirectoryDoesNotExistError';
import { IsNotFileError } from '@/errors/IsNotFileError';
import { IsNotDirectoryError } from '@/errors/IsNotDirectoryError';
import { FileAlreadyExistsError } from '@/errors/FileAlreadyExistsError';

const handler = new LocalStorageHandler('/base');

const assertCopied = async function (target: string, name: string): Promise<void> {
  expect(await isFile(`/base/dir1/file`)).toBe(true);
  expect(await isDirectory(`/base/${target}`)).toBe(true);
  expect(await fs.readdir(`/base/${target}`)).toContain(name);
  expect(await isFile(`/base/${target}/${name}`)).toBe(true);
  expect(await fs.readFile(`/base/${target}/${name}`, 'utf8')).toBe('content');
};

describe('LocalStorageHandler->copyFile', (): void => {
  const testDir = {
    '/base': {
      dir1: {
        file: 'content',
        file2: 'existing'
      },
      dir2: {}
    }
  };

  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  test('copies file with old name.', async (): Promise<void> => {
    mockFS(testDir);

    await handler.copyFile('/dir1/file', '/dir2');

    await assertCopied('dir2', 'file');
  });

  test('copies file with new name.', async (): Promise<void> => {
    mockFS(testDir);

    await handler.copyFile('/dir1/file', '/dir2/newFile');

    await assertCopied('dir2', 'newFile');
  });

  test('copies file to same directory.', async (): Promise<void> => {
    mockFS(testDir);

    await handler.copyFile('/dir1/file', '/dir1/newFile');

    await assertCopied('dir1', 'newFile');
  });

  test('overwrites file.', async (): Promise<void> => {
    mockFS(testDir);

    await handler.copyFile('/dir1/file', '/dir1/file2', true);

    await assertCopied('dir1', 'file2');
  });

  test('throws error if target file already exists.', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.copyFile('/dir1/file', '/dir1/file2');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(FileAlreadyExistsError);
    expect(error?.message).toBe('File /dir1/file2 already exists.');
  });

  test('throws error if source file does not exist.', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.copyFile('/dir1/nope', '/dir1/newFile');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(FileDoesNotExistError);
    expect(error?.message).toBe('File /dir1/nope does not exist.');
  });

  test('throws error if source is not a file.', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.copyFile('/dir1', '/dir2/newFile');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(IsNotFileError);
    expect(error?.message).toBe('/dir1 is not a file.');
  });

  test('throws error if target directory does not exist.', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.copyFile('/dir1/file', '/dir3/copy');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(DirectoryDoesNotExistError);
    expect(error?.message).toBe('Directory /dir3 does not exist.');
  });

  test('throws error if target directory does not exist (forced by trailing slash).', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.copyFile('/dir1/file', '/dir3/');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(DirectoryDoesNotExistError);
    expect(error?.message).toBe('Directory /dir3 does not exist.');
  });

  test('throws error if target parent is not a directory.', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.copyFile('/dir1/file', '/dir1/file/copy');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(IsNotDirectoryError);
    expect(error?.message).toBe('/dir1/file is not a directory.');
  });
});
