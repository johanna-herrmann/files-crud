import fs from 'fs/promises';
import { LocalStorage } from '@/storage/local/LocalStorage';
import mockFS from 'mock-fs';

const wrapper = new LocalStorage('/base');

const exists = async function (path: string): Promise<boolean> {
  try {
    await fs.stat(path);

    return true;
  } catch {
    return false;
  }
};

describe('LocalStorage', (): void => {
  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  test('LocalStorage->constructor created path correctly.', async (): Promise<void> => {
    const newWrapper = new LocalStorage('////test///');

    expect(newWrapper.getDirectory()).toBe('/test');
  });

  test('LocalStorage->writeFile writes file.', async (): Promise<void> => {
    mockFS({ '/base': {} });

    await wrapper.writeFile('file', 'content', 'utf8');

    expect(await exists('/base/file')).toBe(true);
    expect(await fs.readFile('/base/file', 'utf8')).toBe('content');
  });

  test('LocalStorage->readFile reads file.', async (): Promise<void> => {
    mockFS({
      '/base': {
        file: 'content'
      }
    });

    const content = await wrapper.readFile('file', 'utf8');

    expect(content).toBe('content');
  });

  test('LocalStorage->unlink deletes file.', async (): Promise<void> => {
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

  test('LocalStorage->copyFile copies file.', async (): Promise<void> => {
    mockFS({
      '/base': {
        file: 'contentFile',
        other: 'contentOther'
      }
    });

    await wrapper.copyFile('file', 'fileCopy');

    expect(await exists('/base/file')).toBe(true);
    expect(await exists('/base/fileCopy')).toBe(true);
    expect(await fs.readFile('/base/file', 'utf8')).toBe('contentFile');
    expect(await fs.readFile('/base/fileCopy', 'utf8')).toBe('contentFile');
  });
});
