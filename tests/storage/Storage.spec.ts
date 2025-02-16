import { Storage } from '@/storage/Storage';
import mockFS from 'mock-fs';
import { loadConfig } from '@/config/config';
import { FsStorageAdapter } from '@/storage/fs/FsStorageAdapter';
import { S3StorageAdapter } from '@/storage/s3/S3StorageAdapter';
import fs from 'fs/promises';
import paths from 'path';

const exists = async function (path: string): Promise<boolean> {
  try {
    await fs.stat(path);

    return true;
  } catch {
    return false;
  }
};

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

  test('Storage->constructor creates path correctly, specific path.', async (): Promise<void> => {
    loadConfig({ storage: { name: 'fs', path: '/var/specific' }, path: '/var/global' });

    const storage = new Storage();

    expect(storage.getConf()[1]).toBe('/var/specific');
  });

  test('Storage->constructor creates path correctly, global path.', async (): Promise<void> => {
    loadConfig({ storage: { name: 'fs' }, path: '/var/global' });

    const storage = new Storage();

    expect(storage.getConf()[1]).toBe('/var/global');
  });

  test('Storage->constructor creates adapters correctly, fs.', async (): Promise<void> => {
    loadConfig({ storage: { name: 'fs' } });
    const storage = new Storage();

    expect(storage.getConf()[0]).toBe('fs');
    expect(storage.getConf()[2].getDirectory()).toBe(paths.resolve('./'));
    expect((storage.getConf()[3] as FsStorageAdapter).getDirectory()).toBe(paths.resolve('./'));
  });

  test('Storage->constructor creates adapters correctly, s3.', async (): Promise<void> => {
    loadConfig({ storage: { name: 's3' } });

    const storage = new Storage();

    expect(storage.getConf()[0]).toBe('s3');
    expect(storage.getConf()[2].getDirectory()).toBe(paths.resolve('./'));
    expect((storage.getConf()[3] as S3StorageAdapter)?.getConf()[1]).toBe('files-crud');
  });

  test('Storage->save saves file correctly.', async (): Promise<void> => {
    mockFS({ '/base': {} });
    const storage = new Storage();
    const data = { owner: 'me', meta: {}, contentType: 'text/plain', size: 42, md5: '0'.repeat(32) };

    await storage.save('sub/file', Buffer.from('content', 'utf8'), data);

    expect(await exists('/base/files/sub/file')).toBe(true);
    expect(await exists('/base/data/sub~file')).toBe(true);
    expect(await fs.readFile('/base/files/sub/file', 'utf8')).toBe('content');
    expect(JSON.parse(await fs.readFile('/base/data/sub~file', 'utf8'))).toEqual(data);
  });

  test('Storage->load loads file correctly.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain' };
    mockFS({ '/base': { files: { a: { file: 'content' } }, data: { 'a~file': JSON.stringify(data) } } });
    const storage = new Storage();

    const [content, actualData] = await storage.load('a/file');

    expect(content.toString('utf8')).toBe('content');
    expect(actualData).toEqual(data);
  });

  test('Storage->delete deletes file correctly.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain' };
    mockFS({ '/base': { files: { a: { file: 'content' } }, data: { 'a~file': JSON.stringify(data) } } });
    const storage = new Storage();

    await storage.delete('a/file');

    expect(await exists('/base/files/a/file')).toBe(false);
    expect(await exists('/base/data/a~file')).toBe(false);
  });

  test('Storage->copy copies file correctly.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain' };
    mockFS({ '/base': { files: { a: { file: 'content' } }, data: { 'a~file': JSON.stringify(data) } } });
    const storage = new Storage();

    await storage.copy('a/file', 'c/copy');

    expect(await exists('/base/files/a/file')).toBe(true);
    expect(await exists('/base/files/c/copy')).toBe(true);
    expect(await fs.readFile('/base/files/a/file', 'utf8')).toBe('content');
    expect(await fs.readFile('/base/files/c/copy', 'utf8')).toBe('content');
  });

  test('Storage->copy keeps owner.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain' };
    mockFS({ '/base': { files: { a: { file: 'content' } }, data: { 'a~file': JSON.stringify(data) } } });
    const storage = new Storage();

    await storage.copy('a/file', 'c/copy');

    expect(await exists('/base/data/a~file')).toBe(true);
    expect(await exists('/base/data/c~copy')).toBe(true);
    expect(JSON.parse(await fs.readFile('/base/data/a~file', 'utf8'))).toEqual(data);
    expect(JSON.parse(await fs.readFile('/base/data/c~copy', 'utf8'))).toEqual(data);
  });

  test('Storage->copy changes owner.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain' };
    mockFS({ '/base': { files: { a: { file: 'content' } }, data: { 'a~file': JSON.stringify(data) } } });
    const storage = new Storage();

    await storage.copy('a/file', 'c/copy', 'other');

    expect(await exists('/base/data/a~file')).toBe(true);
    expect(await exists('/base/data/c~copy')).toBe(true);
    expect(JSON.parse(await fs.readFile('/base/data/a~file', 'utf8'))).toEqual(data);
    expect(JSON.parse(await fs.readFile('/base/data/c~copy', 'utf8'))).toEqual({ ...data, owner: 'other' });
  });

  test('Storage->move moves file correctly.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain' };
    mockFS({ '/base': { files: { a: { file: 'content' } }, data: { 'a~file': JSON.stringify(data) } } });
    const storage = new Storage();

    await storage.move('a/file', 'c/copy');

    expect(await exists('/base/files/a/file')).toBe(false);
    expect(await exists('/base/files/c/copy')).toBe(true);
    expect(await fs.readFile('/base/files/c/copy', 'utf8')).toBe('content');
  });

  test('Storage->move keeps owner.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain' };
    mockFS({ '/base': { files: { a: { file: 'content' } }, data: { 'a~file': JSON.stringify(data) } } });
    const storage = new Storage();

    await storage.move('a/file', 'c/copy');

    expect(await exists('/base/data/a~file')).toBe(false);
    expect(await exists('/base/data/c~copy')).toBe(true);
    expect(JSON.parse(await fs.readFile('/base/data/c~copy', 'utf8'))).toEqual(data);
  });

  test('Storage->move changes owner.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain' };
    mockFS({ '/base': { files: { a: { file: 'content' } }, data: { 'a~file': JSON.stringify(data) } } });
    const storage = new Storage();

    await storage.move('a/file', 'c/copy', 'other');

    expect(await exists('/base/data/a~file')).toBe(false);
    expect(await exists('/base/data/c~copy')).toBe(true);
    expect(JSON.parse(await fs.readFile('/base/data/c~copy', 'utf8'))).toEqual({ ...data, owner: 'other' });
  });

  test('Storage->loadData loads Data correctly.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain' };
    mockFS({ '/base': { data: { 'a~file': JSON.stringify(data) } } });
    const storage = new Storage();

    const actualData = await storage.loadData('a/file');

    expect(actualData).toEqual(data);
  });

  test('Storage->setData sets Data correctly.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain', size: 42, md5: '0'.repeat(32) };
    mockFS({ '/base': { data: { 'a~file': JSON.stringify(data) } } });
    const storage = new Storage();

    await storage.setData('a/file', { ...data, contentType: 'image/png' });

    expect(await exists('/base/data/a~file')).toBe(true);
    expect(JSON.parse(await fs.readFile('/base/data/a~file', 'utf8'))).toEqual({ ...data, contentType: 'image/png' });
  });

  test('Storage->exists returns true if file exists.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain' };
    mockFS({ '/base': { files: { a: { file: 'content' } }, data: { 'a~file': JSON.stringify(data) } } });
    const storage = new Storage();

    const fileExists = await storage.exists('a/file');

    expect(fileExists).toBe(true);
  });

  test('Storage->exists returns false if file does not exist.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain' };
    mockFS({ '/base': { files: { a: { file: 'content' } }, data: { 'a~file': JSON.stringify(data) } } });
    const storage = new Storage();

    const fileExists = await storage.exists('a/other');

    expect(fileExists).toBe(false);
  });

  test('Storage->isFile returns true if it is a file.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain' };
    mockFS({ '/base': { files: { a: { file: 'content' } }, data: { 'a~file': JSON.stringify(data) } } });
    const storage = new Storage();

    const isFile = await storage.isFile('a/file');

    expect(isFile).toBe(true);
  });

  test('Storage->isFile returns false if it is a directory.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain' };
    mockFS({ '/base': { files: { a: { file: 'content' } }, data: { 'a~file': JSON.stringify(data) } } });
    const storage = new Storage();

    const isFile = await storage.isFile('a');

    expect(isFile).toBe(false);
  });

  test('Storage->isDirectory returns true if it is a directory.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain' };
    mockFS({ '/base': { files: { a: { file: 'content' } }, data: { 'a~file': JSON.stringify(data) } } });
    const storage = new Storage();

    const isDirectory = await storage.isDirectory('a');

    expect(isDirectory).toBe(true);
  });

  test('Storage->isDirectory returns false if it is a file.', async (): Promise<void> => {
    const data = { owner: 'me', meta: {}, contentType: 'text/plain' };
    mockFS({ '/base': { files: { a: { file: 'content' } }, data: { 'a~file': JSON.stringify(data) } } });
    const storage = new Storage();

    const isDirectory = await storage.isDirectory('a/file');

    expect(isDirectory).toBe(false);
  });

  test('Storage->list returns items in directory, sorted alphabetically, directories first and with trailing slashes.', async (): Promise<void> => {
    mockFS({ '/base': { files: { a: { file2: '', dir2: {}, file1: '', dir1: {} } } } });
    const storage = new Storage();

    const items = await storage.list('a');

    expect(items).toEqual(['dir1/', 'dir2/', 'file1', 'file2']);
  });
});
