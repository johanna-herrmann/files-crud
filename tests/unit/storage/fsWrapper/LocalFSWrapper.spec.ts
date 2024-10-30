import fs from 'fs/promises';
import { LocalFSWrapper, exists } from '@/storage/fsWrapper/LocalFSWrapper';
import mockFS from 'mock-fs';

const wrapper = new LocalFSWrapper('/base');

describe('LocalFSWrapper', (): void => {
  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  test('LocalFSWrapper->constructor created path correctly.', async (): Promise<void> => {
    const newWrapper = new LocalFSWrapper('////test///');

    expect(newWrapper.getDirectory()).toBe('/test');
  });

  test('LocalFSWrapper->writeFile writes file.', async (): Promise<void> => {
    mockFS({ '/base': {} });

    await wrapper.writeFile('file', 'content', 'utf8');

    expect(await exists('/base/file')).toBe(true);
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

  test('LocalFSWrapper->unlink deletes file.', async (): Promise<void> => {
    mockFS({
      '/base': {
        file: '',
        file2: ''
      }
    });

    await wrapper.unlink('file');

    expect(await exists('/base/file2')).toBe(true);
    expect(await exists('/base/file')).toBe(false);
  });

  test('LocalFSWrapper->exists returns correct boolean.', async (): Promise<void> => {
    mockFS({
      '/base': {
        flle: ''
      }
    });

    const result1 = await wrapper.exists('file');
    const result2 = await wrapper.exists('file2');

    expect(result1).toBe(await exists('/base/file'));
    expect(result2).toBe(await exists('/base/file2'));
  });
});
