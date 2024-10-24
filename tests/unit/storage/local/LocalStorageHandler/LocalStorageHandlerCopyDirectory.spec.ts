import fs from 'fs/promises';
import { LocalStorageHandler } from '@/storage/local/LocalStorageHandler';
import { isFile, isDirectory } from '@/storage/local/LocalStorageHandlerHelper';
import mockFS from 'mock-fs';
import { DirectoryDoesNotExistError } from '@/errors/DirectoryDoesNotExistError';
import { IsNotDirectoryError } from '@/errors/IsNotDirectoryError';
import { FileAlreadyExistsError } from '@/errors/FileAlreadyExistsError';

const handler = new LocalStorageHandler('/base');

const assertCopied = async function (target: string, name: string, recursive: boolean): Promise<void> {
  expect(await isFile(`/base/dir1/file`)).toBe(true);
  expect(await isDirectory(`/base/${target}`)).toBe(true);
  expect(await fs.readdir(`/base/${target}`)).toEqual([name]);
  expect(await fs.readdir(`/base/${target}/${name}`)).toEqual(['file', 'file2', 'subDir']);
  expect(await fs.readFile(`/base/${target}/${name}/file`, 'utf8')).toBe('content');

  expect(await fs.readdir(`/base/${target}/${name}/subDir`)).toEqual(recursive ? ['dirInSub', 'fileInSub1', 'fileInSub2'] : []);
};

describe('LocalStorageHandler->copyDirectory', (): void => {
  const testDir = {
    '/base': {
      dir1: {
        file: 'content',
        file2: 'existing',
        subDir: {
          fileInSub1: 'contentA',
          fileInSub2: 'contentB',
          dirInSub: {}
        }
      },
      dir2: {},
      dir3: {
        dir1: {
          file: 'existing'
        }
      },
      dir4: {
        existing: {}
      },
      dir5: {
        dir1: {
          subDir: ''
        }
      }
    }
  };

  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  test('copies directory.', async (): Promise<void> => {
    mockFS(testDir);

    await handler.copyDirectory('/dir1', '/dir2/copy');

    await assertCopied('dir2', 'copy', false);
  });

  test('copies directory recursive.', async (): Promise<void> => {
    mockFS(testDir);

    await handler.copyDirectory('/dir1', '/dir2/copy', true);

    await assertCopied('dir2', 'copy', true);
  });

  test('copies into exising directory.', async (): Promise<void> => {
    mockFS(testDir);

    await handler.copyDirectory('/dir1', '/dir4/existing', true);

    await assertCopied('dir4', 'existing', true);
  });

  test('overwrites file while copying directory.', async (): Promise<void> => {
    mockFS(testDir);

    await handler.copyDirectory('/dir1', '/dir3/dir1', false, true);

    await assertCopied('dir3', 'dir1', false);
  });

  test('throws error if file already exists in target, but overwrite is not allowed.', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.copyDirectory('/dir1', '/dir3/dir1', false, false);
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(FileAlreadyExistsError);
    expect(error?.message).toBe('File /dir3/dir1/file already exists.');
  });

  test('throws error if file already exists in target, but should be a directory.', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.copyDirectory('/dir1', '/dir5/dir1', false, false);
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(FileAlreadyExistsError);
    expect(error?.message).toBe('File /dir5/dir1/subDir already exists.');
  });

  test('throws error if source directory does not exist.', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.copyDirectory('/dir1/nope', '/dir1/new');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(DirectoryDoesNotExistError);
    expect(error?.message).toBe('Directory /dir1/nope does not exist.');
  });

  test('throws error if source is not a directory.', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.copyDirectory('/dir1/file', '/dir2/new');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(IsNotDirectoryError);
    expect(error?.message).toBe('/dir1/file is not a directory.');
  });

  test('throws error if target parent directory does not exist.', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.copyDirectory('/dir1', '/dir2/parent/target');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(DirectoryDoesNotExistError);
    expect(error?.message).toBe('Directory /dir2/parent does not exist.');
  });

  test('throws error if target parent is not a directory.', async (): Promise<void> => {
    mockFS(testDir);
    let error: Error | null = null;

    try {
      await handler.copyDirectory('/dir1/file', '/dir1/file/copy');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(IsNotDirectoryError);
    expect(error?.message).toBe('/dir1/file is not a directory.');
  });
});
