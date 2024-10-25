import { exists, isFile, isDirectory } from '@/storage/fsWrapper/LocalFSWrapper';
import mockFS from 'mock-fs';

describe('LocalFSWrapperHelper', (): void => {
  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  test('exists returns true if item exists as file.', async (): Promise<void> => {
    mockFS({ '/file': '' });

    const result = await exists('/file');

    expect(result).toBe(true);
  });

  test('exists returns true if item exists as directory.', async (): Promise<void> => {
    mockFS({ '/dir': {} });

    const result = await exists('/dir');

    expect(result).toBe(true);
  });

  test('exists returns false if item does not exist.', async (): Promise<void> => {
    mockFS({ '/some': {} });

    const result = await exists('/none');

    expect(result).toBe(false);
  });

  test('isFile returns true if file exists.', async (): Promise<void> => {
    mockFS({ '/file': '' });

    const result = await isFile('/file');

    expect(result).toBe(true);
  });

  test('isFile returns false if file does not exist.', async (): Promise<void> => {
    mockFS({ '/some': '' });

    const result = await isFile('/none');

    expect(result).toBe(false);
  });

  test('isFile returns false if item is not a file.', async (): Promise<void> => {
    mockFS({ '/dir': {} });

    const result = await isFile('/dir');

    expect(result).toBe(false);
  });

  test('isDirectory returns true if directory exists.', async (): Promise<void> => {
    mockFS({ '/dir': {} });

    const result = await isDirectory('/dir');

    expect(result).toBe(true);
  });

  test('isDirectory returns false if directory does not exist.', async (): Promise<void> => {
    mockFS({ '/some': {} });

    const result = await isDirectory('/none');

    expect(result).toBe(false);
  });

  test('isDirectory returns false if item is not a directory.', async (): Promise<void> => {
    mockFS({ '/file': '' });

    const result = await isDirectory('/file');

    expect(result).toBe(false);
  });
});
