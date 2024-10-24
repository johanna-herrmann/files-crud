import { LocalStorageHandler } from '@/storage/local/LocalStorageHandler';
import mockFS from 'mock-fs';

describe('LocalStorageHandler->constructor', (): void => {
  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  test('removes leading slash from path.', async (): Promise<void> => {
    const newHandler = new LocalStorageHandler('/base');

    expect(newHandler.getBasePath()).toBe('/base');
  });

  test('removes trailing slash from path.', async (): Promise<void> => {
    const newHandler = new LocalStorageHandler('base/');

    expect(newHandler.getBasePath()).toBe('/base');
  });

  test('makes relative path absolute.', async (): Promise<void> => {
    const newHandler = new LocalStorageHandler('base');

    expect(newHandler.getBasePath()).toBe('/base');
  });
});
