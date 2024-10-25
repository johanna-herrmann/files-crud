import fs from 'fs/promises';
import { LocalFSWrapper, exists, isFile, isDirectory } from '@/storage/fsWrapper/LocalFSWrapper';
import mockFS from 'mock-fs';

const wrapper = new LocalFSWrapper('/base');

describe('LocalFSWrapper', (): void => {
  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  describe('helpers', (): void => {
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

  test('LocalFSWrapper->constructor created path correctly.', async (): Promise<void> => {
    const newWrapper = new LocalFSWrapper('////test///');

    expect(newWrapper.getRoot()).toBe('/test');
  });

  test('LocalFSWrapper->writeFile writes file.', async (): Promise<void> => {
    mockFS({ '/base': {} });

    await wrapper.writeFile('file', 'content', 'utf8');

    expect(await isFile('/base/file')).toBe(true);
    expect(await fs.readFile('/base/file', 'utf8')).toBe('content');
  });

  test('LocalFSWrapper->readFile reads file.', async (): Promise<void> => {
    mockFS({
      '/base': {
        file: 'content'
      }
    });

    const content = await wrapper.readFile('file', 'utf8');

    expect(content).toBe('content');
  });

  test('LocalFSWrapper->mkdir creates directory.', async (): Promise<void> => {
    mockFS({ '/base': {} });

    await wrapper.mkdir('dir');

    expect(await isDirectory('/base/dir')).toBe(true);
  });

  test('LocalFSWrapper->readdir lists directory contents.', async (): Promise<void> => {
    mockFS({
      '/base': {
        dir: {
          dir1: {},
          dir2: {},
          file1: '',
          file2: ''
        }
      }
    });

    const items = await wrapper.readdir('dir');

    expect(items).toEqual(['dir1', 'dir2', 'file1', 'file2']);
  });

  test('LocalFSWrapper->copyFile copies file.', async (): Promise<void> => {
    mockFS({
      '/base': {
        file: 'content'
      }
    });

    await wrapper.copyFile('file', 'file2');

    expect(await isFile('/base/file')).toBe(true);
    expect(await isFile('/base/file2')).toBe(true);
  });

  test('LocalFSWrapper->unlink deletes file.', async (): Promise<void> => {
    mockFS({
      '/base': {
        file: '',
        file2: ''
      }
    });

    await wrapper.unlink('file');

    expect(await isFile('/base/file2')).toBe(true);
    expect(await exists('/base/file')).toBe(false);
  });

  test('LocalFSWrapper->rmdir deletes empty directory.', async (): Promise<void> => {
    mockFS({
      '/base': {
        dir: {},
        dir2: {}
      }
    });

    await wrapper.rmdir('dir');

    expect(await isDirectory('/base/dir2')).toBe(true);
    expect(await exists('/base/dir')).toBe(false);
  });

  test('LocalFSWrapper->rmRf deletes entire directory.', async (): Promise<void> => {
    mockFS({
      '/base': {
        dir: {
          file: '',
          file2: '',
          someDir: {}
        },
        dir2: {
          file: ''
        }
      }
    });

    await wrapper.rmRf('dir');

    expect(await isDirectory('/base/dir2')).toBe(true);
    expect(await exists('/base/dir')).toBe(false);
  });

  test('LocalFSWrapper->rename renames file.', async (): Promise<void> => {
    mockFS({
      '/base': {
        file: ''
      }
    });

    await wrapper.rename('file', 'file2');

    expect(await isFile('/base/file2')).toBe(true);
    expect(await exists('/base/file')).toBe(false);
  });

  test('LocalFSWrapper->rename renames directory.', async (): Promise<void> => {
    mockFS({
      '/base': {
        dir: {}
      }
    });

    await wrapper.rename('dir', 'dir2');

    expect(await isDirectory('/base/dir2')).toBe(true);
    expect(await exists('/base/dir')).toBe(false);
  });

  test('LocalFSWrapper->exists returns correct boolean.', async (): Promise<void> => {
    mockFS({
      '/base': {
        dir: {},
        flle: ''
      }
    });

    const result1 = await wrapper.exists('dir');
    const result2 = await wrapper.exists('dir2');
    const result3 = await wrapper.exists('file');
    const result4 = await wrapper.exists('file2');

    expect(result1).toBe(await exists('/base/dir'));
    expect(result2).toBe(await exists('/base/dir2'));
    expect(result3).toBe(await exists('/base/file'));
    expect(result4).toBe(await exists('/base/file2'));
  });

  test('LocalFSWrapper->isFile returns correct boolean.', async (): Promise<void> => {
    mockFS({
      '/base': {
        dir: {},
        flle: ''
      }
    });

    const result1 = await wrapper.isFile('file');
    const result2 = await wrapper.isFile('dir');
    const result3 = await wrapper.isFile('none');

    expect(result1).toBe(await isFile('/base/file'));
    expect(result2).toBe(await isFile('/base/dir'));
    expect(result3).toBe(await isFile('/base/none'));
  });

  test('LocalFSWrapper->isDirectory returns correct boolean.', async (): Promise<void> => {
    mockFS({
      '/base': {
        dir: {},
        flle: ''
      }
    });

    const result1 = await wrapper.isDirectory('dir');
    const result2 = await wrapper.isDirectory('file');
    const result3 = await wrapper.isDirectory('none');

    expect(result1).toBe(await isDirectory('/base/dir'));
    expect(result2).toBe(await isDirectory('/base/file'));
    expect(result3).toBe(await isDirectory('/base/none'));
  });
});
