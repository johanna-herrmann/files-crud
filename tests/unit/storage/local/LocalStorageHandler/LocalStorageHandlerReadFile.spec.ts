import { LocalStorageHandler } from '@/storage/local/LocalStorageHandler';
import mockFS from 'mock-fs';
import { FileDoesNotExistError } from '@/errors/FileDoesNotExistError';
import { IsNotFileError } from '@/errors/IsNotFileError';

const handler = new LocalStorageHandler('/base');

describe('LocalStorageHandler->readFile', (): void => {
  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  test('returns file content if file exists.', async (): Promise<void> => {
    mockFS({
      '/base/test.txt': 'some text'
    });

    const content = await handler.readFile('/test.txt', 'utf8');

    expect(content).toBe('some text');
  });

  test('throws error if file does not exist.', async (): Promise<void> => {
    mockFS({ '/base': {} });
    let error: Error | null = null;

    try {
      await handler.readFile('/test.txt', 'utf8');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(FileDoesNotExistError);
    expect(error?.message).toBe('File /test.txt does not exist.');
  });

  test('throws error if it is not a file.', async (): Promise<void> => {
    mockFS({ '/base/test.txt': {} });
    let error: Error | null = null;

    try {
      await handler.readFile('/test.txt', 'utf8');
    } catch (err: unknown) {
      error = err as Error;
    }

    expect(error).toBeInstanceOf(IsNotFileError);
    expect(error?.message).toBe('/test.txt is not a file.');
  });
});
