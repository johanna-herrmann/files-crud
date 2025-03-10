import fs from 'fs/promises';
import mockFS from 'mock-fs';
import { loadConfig } from '@/config/config';
import { DataAndStructureStorage } from '@/storage/fs/DataAndStructureStorage';
import { FsStorageAdapter } from '@/storage/fs/FsStorageAdapter';

const exists = async function (path: string): Promise<boolean> {
  try {
    await fs.stat(path);

    return true;
  } catch {
    return false;
  }
};

const storage = new DataAndStructureStorage('/base');

jest.mock('uuid', () => {
  const actual = jest.requireActual('uuid');
  return {
    ...actual,
    v4(): string {
      return 'abc123...';
    }
  };
});

describe('DataAndStructureStorage', (): void => {
  beforeEach(async (): Promise<void> => {
    loadConfig();
  });

  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  test('DataAndStructureStorage->constructor created path and adapter correctly.', async (): Promise<void> => {
    const newStorage = new DataAndStructureStorage('/given');

    expect(newStorage.getDirectory()).toBe('/given');
    expect(newStorage.getStorageAdapter().getDirectory()).toBe('/given');
    expect(newStorage.getStorageAdapter()).toBeInstanceOf(FsStorageAdapter);
  });

  test('DataAndStructureStorage->save saves data file, creating new key.', async (): Promise<void> => {
    mockFS({ '/base': { file: JSON.stringify({}) } });

    const key = await storage.save('file', { owner: '', contentType: '', md5: '', size: 42 });

    expect(await exists('/base/file')).toBe(true);
    expect(JSON.parse(await fs.readFile('/base/file', 'utf8'))).toEqual({ owner: '', contentType: '', md5: '', size: 42, key: 'ab/abc123...' });
    expect(key).toBe('ab/abc123...');
  });

  test('DataAndStructureStorage->save saves data file, using old key.', async (): Promise<void> => {
    mockFS({ '/base': { file: JSON.stringify({ key: 'ol/oldKey' }) } });

    const key = await storage.save('file', { owner: '', contentType: '', md5: '', size: 42 });

    expect(await exists('/base/file')).toBe(true);
    expect(JSON.parse(await fs.readFile('/base/file', 'utf8'))).toEqual({ owner: '', contentType: '', md5: '', size: 42, key: 'ol/oldKey' });
    expect(key).toBe('ol/oldKey');
  });

  test('DataAndStructureStorage->load loads file data if it exists.', async (): Promise<void> => {
    const expectedData = { owner: '', contentType: '', md5: '', size: 42, key: 'te/testKey' };
    mockFS({ '/base': { file: JSON.stringify(expectedData) } });

    const data = await storage.load('file');

    expect(data).toEqual(expectedData);
  });

  test('DataAndStructureStorage->load returns null data object if it does not exist.', async (): Promise<void> => {
    mockFS({ '/base': {} });

    const data = await storage.load('file');

    expect(data).toEqual({ size: -1, md5: '', contentType: '' });
  });

  test('DataAndStructureStorage->copy copies data file, creating new key.', async (): Promise<void> => {
    const expectedData = { owner: '', contentType: '', md5: '', size: 42, key: 'te/testKey' };
    mockFS({ '/base': { file: JSON.stringify(expectedData) } });

    const key = await storage.copy('file', 'copy');

    expect(await exists('/base/copy')).toBe(true);
    expect(await exists('/base/file')).toBe(true);
    expect(JSON.parse(await fs.readFile('/base/copy', 'utf8'))).toEqual({ ...expectedData, key: 'ab/abc123...' });
    expect(key).toBe('ab/abc123...');
  });

  test('DataAndStructureStorage->copy copies data file, using key.', async (): Promise<void> => {
    const expectedData = { owner: '', contentType: '', md5: '', size: 42, key: 'te/testKey' };
    mockFS({ '/base': { file: JSON.stringify(expectedData), copy: JSON.stringify({ key: 'us/useThis' }) } });

    const key = await storage.copy('file', 'copy');

    expect(await exists('/base/copy')).toBe(true);
    expect(await exists('/base/file')).toBe(true);
    expect(JSON.parse(await fs.readFile('/base/copy', 'utf8'))).toEqual({ ...expectedData, key: 'us/useThis' });
    expect(key).toBe('us/useThis');
  });

  test('DataAndStructureStorage->move moves data file.', async (): Promise<void> => {
    const expectedData = { owner: '', contentType: '', md5: '', size: 42, key: 'te/testKey' };
    mockFS({ '/base': { file: JSON.stringify(expectedData) } });

    await storage.move('file', 'moved');

    expect(await exists('/base/moved')).toBe(true);
    expect(await exists('/base/file')).toBe(false);
    expect(JSON.parse(await fs.readFile('/base/moved', 'utf8'))).toEqual(expectedData);
  });

  test('DataAndStructureStorage->delete removes data file.', async (): Promise<void> => {
    mockFS({ '/base': { file: '', other: '' } });

    await storage.delete('file');

    expect(await exists('/base/other')).toBe(true);
    expect(await exists('/base/file')).toBe(false);
    expect(await fs.readFile('/base/other', 'utf8')).toBe('');
  });

  test('DataAndStructureStorage->filesExists returns true if it exists and is a file.', async (): Promise<void> => {
    mockFS({ '/base': { file: '', dir: {} } });

    const file = await storage.fileExists('file');
    const dir = await storage.fileExists('dir');
    const nothing = await storage.fileExists('nothing');

    expect(file).toBe(true);
    expect(dir).toBe(false);
    expect(nothing).toBe(false);
  });

  test('DataAndStructureStorage->directoryExists returns true if it exists and is a directory.', async (): Promise<void> => {
    mockFS({ '/base': { file: '', dir: {} } });

    const file = await storage.directoryExists('file');
    const dir = await storage.directoryExists('dir');
    const nothing = await storage.directoryExists('nothing');

    expect(file).toBe(false);
    expect(dir).toBe(true);
    expect(nothing).toBe(false);
  });

  test('DataAndStructureStorage->directoryExists returns always true if called on root.', async (): Promise<void> => {
    mockFS({});

    const exists = await storage.directoryExists('');

    expect(exists).toBe(true);
  });

  test('Storage->list returns items in directory, sorted alphabetically, directories first and with trailing slashes.', async (): Promise<void> => {
    mockFS({ '/base': { a: { file2: '', dir2: {}, file1: '', dir1: {} } } });
    const items = await storage.list('a');

    expect(items).toEqual(['dir1/', 'dir2/', 'file1', 'file2']);
  });

  test('Storage->list returns empty result, if called on root, before any file is stored.', async (): Promise<void> => {
    mockFS({});
    const items = await storage.list('');

    expect(items).toEqual([]);
  });
});
