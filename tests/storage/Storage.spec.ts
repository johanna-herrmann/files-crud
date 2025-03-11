import fs from 'fs/promises';
import paths from 'path';
import mockFS from 'mock-fs';
import { Storage } from '@/storage/Storage';
import { loadConfig } from '@/config/config';
import { FsStorageAdapter } from '@/storage/fs/FsStorageAdapter';
import { S3StorageAdapter } from '@/storage/s3/S3StorageAdapter';
import { exists } from '#/utils';

jest.mock('uuid', () => {
  const actual = jest.requireActual('uuid');
  return {
    ...actual,
    v4(): string {
      return 'testUUID';
    }
  };
});

describe('Storage', (): void => {
  beforeEach(async (): Promise<void> => {
    loadConfig({ storage: { name: 'fs', path: '/base' } });
  });

  afterEach(async (): Promise<void> => {
    mockFS.restore();
  });

  test('Storage->constructor creates path correctly, default path.', async (): Promise<void> => {
    loadConfig();

    const storage = new Storage();

    expect(storage.getConf()[1]).toBe(paths.resolve('./'));
  });

  test('Storage->constructor creates path correctly.', async (): Promise<void> => {
    loadConfig({ storage: { name: 'fs', path: '/var/specific' } });

    const storage = new Storage();

    expect(storage.getConf()[1]).toBe('/var/specific');
  });

  test('Storage->constructor creates adapters correctly, fs.', async (): Promise<void> => {
    loadConfig({ storage: { name: 'fs' } });
    const storage = new Storage();

    expect(storage.getConf()[0]).toBe('fs');
    expect(storage.getConf()[2].getDirectory()).toBe(paths.resolve('./data'));
    expect((storage.getConf()[3] as FsStorageAdapter).getDirectory()).toBe(paths.resolve('./files'));
  });

  test('Storage->constructor creates adapters correctly, s3.', async (): Promise<void> => {
    loadConfig({ storage: { name: 's3' } });

    const storage = new Storage();

    expect(storage.getConf()[0]).toBe('s3');
    expect(storage.getConf()[2].getDirectory()).toBe(paths.resolve('./data'));
    expect((storage.getConf()[3] as S3StorageAdapter)?.getConf()[1]).toBe('files-crud');
  });

  test('Storage->save saves file correctly.', async (): Promise<void> => {
    mockFS({ '/base': {} });
    const storage = new Storage();
    const data = { owner: 'me', meta: {}, contentType: 'text/plain', size: 42, md5: '0'.repeat(32) };

    await storage.save('sub/file', Buffer.from('content', 'utf8'), data);

    expect(await exists('/base/files/te/testUUID')).toBe(true);
    expect(await exists('/base/data/sub/file')).toBe(true);
    expect(await fs.readFile('/base/files/te/testUUID', 'utf8')).toBe('content');
    expect(JSON.parse(await fs.readFile('/base/data/sub/file', 'utf8'))).toEqual({ ...data, key: 'te/testUUID' });
  });

  test('Storage->load loads file correctly.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain', key: 'te/test' };
    mockFS({ '/base': { files: { te: { test: 'content' } }, data: { a: { file: JSON.stringify(data) } } } });
    const storage = new Storage();

    const [content, actualData] = await storage.load('a/file');

    expect(content.toString('utf8')).toBe('content');
    expect(actualData).toEqual(data);
  });

  test('Storage->delete deletes file correctly.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain', key: 'te/test' };
    mockFS({ '/base': { files: { te: { test: 'content' } }, data: { a: { file: JSON.stringify(data) } } } });
    const storage = new Storage();

    await storage.delete('a/file');

    expect(await exists('/base/files/te/test')).toBe(false);
    expect(await exists('/base/data/a/file')).toBe(false);
  });

  test('Storage->deleteAllFilesFromUser deletes all files from a user.', async (): Promise<void> => {
    const data1 = { owner: 'testId', meta: {}, contentType: 'text/plain', key: 'te/test1' };
    const data2 = { owner: 'testId', meta: {}, contentType: 'text/plain', key: 'te/test2' };
    const data3 = { owner: 'otherId', meta: {}, contentType: 'text/plain', key: 'te/test3' };
    const data4 = { owner: 'otherId', meta: {}, contentType: 'text/plain', key: 'te/test4' };
    mockFS({
      '/base': {
        files: { te: { test1: 'content1', test2: 'content2', test3: 'content3', test4: 'content4' } },
        data: { dir: { file1: JSON.stringify(data1), file3: JSON.stringify(data3) }, file2: JSON.stringify(data2), file4: JSON.stringify(data4) }
      }
    });
    const storage = new Storage();

    await storage.deleteAllFilesFromUser('testId');

    expect(await exists('/base/files/te/test1')).toBe(false);
    expect(await exists('/base/files/te/test2')).toBe(false);
    expect(await exists('/base/data/dir/file1')).toBe(false);
    expect(await exists('/base/data/file2')).toBe(false);

    expect(await exists('/base/files/te/test3')).toBe(true);
    expect(await exists('/base/files/te/test4')).toBe(true);
    expect(await exists('/base/data/dir/file3')).toBe(true);
    expect(await exists('/base/data/file4')).toBe(true);
  });

  test('Storage->copy copies file correctly, keeping owner.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain', key: 'so/sourceKey' };
    mockFS({ '/base': { files: { so: { sourceKey: 'content' } }, data: { a: { file: JSON.stringify(data) } } } });
    const storage = new Storage();

    await storage.copy('a/file', 'c/copy');

    expect(await exists('/base/files/so/sourceKey')).toBe(true);
    expect(await exists('/base/files/te/testUUID')).toBe(true);
    expect(await exists('/base/data/a/file')).toBe(true);
    expect(await exists('/base/data/c/copy')).toBe(true);
    expect(await fs.readFile('/base/files/so/sourceKey', 'utf8')).toBe('content');
    expect(await fs.readFile('/base/files/te/testUUID', 'utf8')).toBe('content');
    expect(JSON.parse(await fs.readFile('/base/data/a/file', 'utf8'))).toEqual(data);
    expect(JSON.parse(await fs.readFile('/base/data/c/copy', 'utf8'))).toEqual({ ...data, key: 'te/testUUID' });
  });

  test('Storage->copy copies file correctly, changing owner.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain', key: 'so/sourceKey' };
    mockFS({ '/base': { files: { so: { sourceKey: 'content' } }, data: { a: { file: JSON.stringify(data) } } } });
    const storage = new Storage();

    await storage.copy('a/file', 'c/copy', 'newOwner');

    expect(await exists('/base/files/so/sourceKey')).toBe(true);
    expect(await exists('/base/files/te/testUUID')).toBe(true);
    expect(await exists('/base/data/a/file')).toBe(true);
    expect(await exists('/base/data/c/copy')).toBe(true);
    expect(await fs.readFile('/base/files/so/sourceKey', 'utf8')).toBe('content');
    expect(await fs.readFile('/base/files/te/testUUID', 'utf8')).toBe('content');
    expect(JSON.parse(await fs.readFile('/base/data/a/file', 'utf8'))).toEqual(data);
    expect(JSON.parse(await fs.readFile('/base/data/c/copy', 'utf8'))).toEqual({ ...data, key: 'te/testUUID', owner: 'newOwner' });
  });

  test('Storage->move moves file correctly.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain', key: 'so/sourceKey' };
    mockFS({ '/base': { files: { so: { sourceKey: 'content' } }, data: { a: { file: JSON.stringify(data) } } } });
    const storage = new Storage();

    await storage.move('a/file', 'c/copy');

    expect(await exists('/base/files/so/sourceKey')).toBe(true);
    expect(await exists('/base/data/a/file')).toBe(false);
    expect(await exists('/base/data/c/copy')).toBe(true);
    expect(await fs.readFile('/base/files/so/sourceKey', 'utf8')).toBe('content');
    expect(JSON.parse(await fs.readFile('/base/data/c/copy', 'utf8'))).toEqual(data);
  });

  test('Storage->loadData loads Data correctly.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain', size: 42, md5: 'testMD5', key: 'so/sourceKey' };
    mockFS({ '/base': { files: { so: { sourceKey: '' } }, data: { a: { file: JSON.stringify(data) } } } });
    const storage = new Storage();

    const actualData = await storage.loadData('a/file');

    expect(actualData).toEqual(data);
  });

  test('Storage->loadData returns nullObject if file does not exist.', async (): Promise<void> => {
    const data = { size: -1, md5: '', contentType: '' };
    mockFS({ '/base': {} });
    const storage = new Storage();

    const actualData = await storage.loadData('a/file');

    expect(actualData).toEqual(data);
  });

  test('Storage->saveData saves file data correctly.', async (): Promise<void> => {
    mockFS({ '/base': {} });
    const storage = new Storage();
    const data = { owner: 'me', meta: {}, contentType: 'text/plain', size: 42, md5: 'testMD5' };
    mockFS({ '/base': { files: { so: { sourceKey: '' } }, data: { a: { file: JSON.stringify({ ...data, size: 0, key: 'so/sourceKey' }) } } } });

    await storage.saveData('a/file', data);

    expect(await exists('/base/data/a/file')).toBe(true);
    expect(JSON.parse(await fs.readFile('/base/data/a/file', 'utf8'))).toEqual({ ...data, key: 'so/sourceKey' });
  });

  test('Storage->fileExists returns true if it is a file.', async (): Promise<void> => {
    mockFS({ '/base': { data: { a: { file: '' } } } });
    const storage = new Storage();

    const isFile = await storage.fileExists('a/file');

    expect(isFile).toBe(true);
  });

  test('Storage->fileExists returns false if does not exist.', async (): Promise<void> => {
    mockFS({ '/base': { data: {} } });
    const storage = new Storage();

    const isFile = await storage.fileExists('a/file');

    expect(isFile).toBe(false);
  });

  test('Storage->directoryExists returns true if it is a directory.', async (): Promise<void> => {
    mockFS({ '/base': { data: { a: {} } } });
    const storage = new Storage();

    const isDirectory = await storage.directoryExists('a');

    expect(isDirectory).toBe(true);
  });

  test('Storage->directoryExists returns false if does not exist.', async (): Promise<void> => {
    mockFS({ '/base': { data: {} } });
    const storage = new Storage();

    const isDirectory = await storage.directoryExists('a');

    expect(isDirectory).toBe(false);
  });

  test('Storage->list returns items in directory, sorted alphabetically, directories first and with trailing slashes.', async (): Promise<void> => {
    mockFS({ '/base': { data: { a: { file2: '', dir2: {}, file1: '', dir1: {} } } } });
    const storage = new Storage();

    const items = await storage.list('a');

    expect(items).toEqual(['dir1/', 'dir2/', 'file1', 'file2']);
  });
});
