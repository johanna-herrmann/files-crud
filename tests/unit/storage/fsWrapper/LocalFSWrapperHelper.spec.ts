import { exists } from '@/storage/fsWrapper/LocalFSWrapper';
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
});
