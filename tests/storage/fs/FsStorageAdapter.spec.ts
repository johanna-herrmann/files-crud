import fs from 'fs/promises';
import { FsStorageAdapter } from '@/storage/fs/FsStorageAdapter';
import mockFS from 'mock-fs';
import { loadConfig } from '@/config/config';

const exists = async function (path: string): Promise<boolean> {
  try {
    await fs.stat(path);

    return true;
  } catch {
    return false;
  }
};

const storage = new FsStorageAdapter('/base');

describe('FsStorageAdapter', (): void => {
  beforeEach(async (): Promise<void> => {
    loadConfig();
  });

  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  test('FsStorageAdapter->constructor created path correctly.', async (): Promise<void> => {
    const newStorage = new FsStorageAdapter('/given');

    expect(newStorage.getDirectory()).toBe('/given');
  });

  test('FsStorageAdapter->write writes file, string.', async (): Promise<void> => {
    mockFS({ '/base': {} });

    await storage.write('sub/file', 'content', 'utf8');

    expect(await exists('/base/sub/file')).toBe(true);
    expect(await fs.readFile('/base/sub/file', 'utf8')).toBe('content');
  });

  test('FsStorageAdapter->write writes file, buffer.', async (): Promise<void> => {
    mockFS({ '/base': {} });

    await storage.write('sub/file', Buffer.from('content', 'utf8'));

    expect(await exists('/base/sub/file')).toBe(true);
    expect(await fs.readFile('/base/sub/file', 'utf8')).toBe('content');
  });

  test('FsStorageAdapter->read reads file, string.', async (): Promise<void> => {
    mockFS({
      '/base': {
        file: 'content'
      }
    });

    const content = await storage.read('file', 'utf8');

    expect(content).toBe('content');
  });

  test('FsStorageAdapter->read reads file, buffer.', async (): Promise<void> => {
    mockFS({
      '/base': {
        file: 'content'
      }
    });

    const content = await storage.read('file');

    expect(content.toString('utf8')).toBe('content');
  });

  test('FsStorageAdapter->delete deletes file.', async (): Promise<void> => {
    mockFS({
      '/base/sub': {
        file: '',
        file2: ''
      }
    });

    await storage.delete('sub/file');

    expect(await exists('/base/sub/file2')).toBe(true);
    expect(await exists('/base/sub/file')).toBe(false);
  });

  test('FsStorageAdapter->delete deletes file and directory.', async (): Promise<void> => {
    mockFS({
      '/base/sub': {
        file: ''
      }
    });

    await storage.delete('sub/file');

    expect(await exists('/base/sub')).toBe(false);
    expect(await exists('/base')).toBe(true);
  });

  test('FsStorageAdapter->delete deletes file and directory recursively.', async (): Promise<void> => {
    mockFS({
      '/base/a': {
        file: '',
        b: {
          c: {
            d: {
              e: {
                file: ''
              }
            }
          }
        }
      }
    });

    await storage.delete('a/b/c/d/e/file');

    expect(await exists('/base/a/b/c/d/e')).toBe(false);
    expect(await exists('/base/a/file')).toBe(true);
  });

  test('FsStorageAdapter->copy copies file.', async (): Promise<void> => {
    mockFS({
      '/base/a/file': 'contentFile'
    });

    await storage.copy('a/file', 'c/copy');

    expect(await exists('/base/a/file')).toBe(true);
    expect(await exists('/base/c/copy')).toBe(true);
    expect(await fs.readFile('/base/a/file', 'utf8')).toBe('contentFile');
    expect(await fs.readFile('/base/c/copy', 'utf8')).toBe('contentFile');
  });
});
