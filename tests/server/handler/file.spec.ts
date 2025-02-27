import User from '@/types/user/User';
import { assertError, assertOK, buildRequestForFileAction, buildResponse, resetLastMessage } from '#/server/expressTestUtils';
import { testUser } from '#/testItems';
import mockFS from 'mock-fs';
import {
  copyHandler,
  deleteHandler,
  listHandler,
  loadDataHandler,
  loadHandler,
  loadMetaHandler,
  moveHandler,
  saveHandler,
  saveMetaHandler,
  directoryExistsHandler,
  fileExistsHandler
} from '@/server/handler/file';
import { DirectoryItem } from 'mock-fs/lib/filesystem';
import fs from 'fs/promises';
import UploadRequest from '@/types/server/UploadRequest';
import { Readable, Writable } from 'stream';
import { Logger } from '@/logging/Logger';

let mocked_user: User | null = null;

jest.mock('@/user/auth', () => {
  const actual = jest.requireActual('@/user/auth');
  return {
    ...actual,
    async authorize(jwt: string | undefined): Promise<User | null> {
      if (jwt === '') {
        return mocked_user;
      }
      return null;
    }
  };
});

jest.mock('@/logging/index', () => {
  const logger: Logger = {
    debug() {
      return this;
    },
    info() {
      return this;
    },
    warn() {
      return this;
    },
    error() {
      return this;
    }
  } as unknown as Logger;
  // noinspection JSUnusedGlobalSymbols
  return {
    resetLogger() {},
    loadLogger(): Logger {
      return logger;
    },
    getLogger(): Logger {
      return logger;
    }
  };
});

const buildFSMock = function (files: DirectoryItem, data: DirectoryItem): void {
  mockFS({
    './files': files,
    './data': data
  });
};

const buildUploadRequest = function (data: Buffer, mimetype: string, md5: string, key?: string): UploadRequest {
  const req = buildRequestForFileAction('', 'save', 'dir/file', { userId: testUser.id });
  const reqWithHeaders = {
    ...req,
    header(name: string) {
      return this.headers[name];
    }
  };
  return {
    ...reqWithHeaders,
    files: {
      [key ?? 'file']: {
        data,
        mimetype,
        md5
      }
    }
  } as unknown as UploadRequest;
};

const buildDownloadRequest = function (): UploadRequest {
  const req = buildRequestForFileAction('', 'one', 'dir/file', { username: testUser.username });
  return {
    ...req,
    header(name: string) {
      return this.headers[name];
    }
  } as UploadRequest;
};

const exists = async function (path: string): Promise<boolean> {
  try {
    await fs.stat(path);

    return true;
  } catch {
    return false;
  }
};

describe('file handlers', (): void => {
  const contentBuffer = Buffer.from('test content', 'utf8');

  beforeEach(async (): Promise<void> => {
    mocked_user = null;
    buildFSMock({}, {});
  });

  afterEach(async () => {
    resetLastMessage();
    mockFS.restore();
  });

  describe('saveHandler', (): void => {
    test('saves file, mimetype from files attribute, create, default key', async (): Promise<void> => {
      const data = {
        owner: testUser.id,
        contentType: 'text/plain',
        size: 12,
        md5: 'testMD5'
      };
      const req = buildUploadRequest(Buffer.from('test content', 'utf8'), 'text/plain', 'testMD5');
      const res = buildResponse();

      await saveHandler(req, res);

      expect(await exists('./files/dir/file')).toBe(true);
      expect(await exists('./data/dir~file')).toBe(true);
      expect(await fs.readFile('./files/dir/file', 'utf8')).toBe('test content');
      expect(JSON.parse(await fs.readFile('./data/dir~file', 'utf8'))).toEqual(data);
      assertOK(res, { path: 'dir/file' });
    });

    test('saves file, mimetype from files attribute, create, custom key', async (): Promise<void> => {
      const data = {
        owner: testUser.id,
        contentType: 'text/plain',
        size: 12,
        md5: 'testMD5'
      };
      const req = buildUploadRequest(Buffer.from('test content', 'utf8'), 'text/plain', 'testMD5', 'custom');
      const res = buildResponse();

      await saveHandler(req, res);

      expect(await exists('./files/dir/file')).toBe(true);
      expect(await exists('./data/dir~file')).toBe(true);
      expect(await fs.readFile('./files/dir/file', 'utf8')).toBe('test content');
      expect(JSON.parse(await fs.readFile('./data/dir~file', 'utf8'))).toEqual(data);
      assertOK(res, { path: 'dir/file' });
    });

    test('saves file, mimetype from files attribute, update', async (): Promise<void> => {
      const data = {
        owner: 'owner',
        contentType: 'text/plain',
        size: 12,
        md5: 'testMD5',
        meta: {}
      };
      const req = buildUploadRequest(Buffer.from('test content', 'utf8'), 'text/plain', 'testMD5');
      const res = buildResponse();
      buildFSMock({ dir: { file: '' } }, { 'dir~file': JSON.stringify(data) });

      await saveHandler(req, res);

      expect(await exists('./files/dir/file')).toBe(true);
      expect(await exists('./data/dir~file')).toBe(true);
      expect(await fs.readFile('./files/dir/file', 'utf8')).toBe('test content');
      expect(JSON.parse(await fs.readFile('./data/dir~file', 'utf8'))).toEqual(data);
      assertOK(res, { path: 'dir/file' });
    });

    test('saves file, mimetype from header', async (): Promise<void> => {
      const data = {
        owner: testUser.id,
        contentType: 'image/png',
        size: 12,
        md5: 'testMD5'
      };
      const req = buildUploadRequest(Buffer.from('test content', 'utf8'), 'text/plain', 'testMD5');
      const res = buildResponse();
      req.headers['X-Mimetype'] = 'image/png';

      await saveHandler(req, res);

      expect(await exists('./files/dir/file')).toBe(true);
      expect(await exists('./data/dir~file')).toBe(true);
      expect(await fs.readFile('./files/dir/file', 'utf8')).toBe('test content');
      expect(JSON.parse(await fs.readFile('./data/dir~file', 'utf8'))).toEqual(data);
      assertOK(res, { path: 'dir/file' });
    });

    test('saves file, without jailbreak', async (): Promise<void> => {
      const req = buildUploadRequest(Buffer.from('test content', 'utf8'), 'text/plain', 'testMD5');
      (req.params as Record<string, string | string[]>).path = ['..', '..', 'file'];
      const res = buildResponse();
      req.headers['X-Mimetype'] = 'image/png';

      await saveHandler(req, res);

      expect(await exists('./files/file')).toBe(true);
      assertOK(res, { path: 'file' });
    });
  });

  describe('loadHandler', (): void => {
    const stream = Readable.from(contentBuffer);

    let readableSpy: jest.Spied<typeof Readable.from>;
    let streamSpy: jest.Spied<typeof stream.pipe>;

    afterEach(async (): Promise<void> => {
      readableSpy?.mockRestore();
      streamSpy?.mockRestore();
    });

    test('loads file if it exists, mimetype from fileData', (done): void => {
      buildFSMock(
        { dir: { file: contentBuffer } },
        { 'dir~file': JSON.stringify({ owner: testUser.username, contentType: 'text/plain', meta: { k: 'v' }, size: 12 }) }
      );
      const req = buildDownloadRequest();
      const res = buildResponse();
      let piped: Writable | null = null;
      let buffer: Buffer | null = null;
      readableSpy = jest.spyOn(Readable, 'from').mockImplementation((iterable: Iterable<unknown> | AsyncIterable<unknown>) => {
        buffer = iterable as Buffer;
        streamSpy = jest.spyOn(stream, 'pipe').mockImplementation((destination) => {
          piped = destination as typeof res;
          return destination;
        });
        return stream;
      });

      loadHandler(req, res);

      setTimeout(() => {
        expect(buffer).toEqual(contentBuffer);
        expect(piped).toEqual(res);
        expect(res.getHeader('content-length')).toBe(12);
        expect(res.getHeader('content-type')).toBe('text/plain');
        expect(res.getHeader('content-disposition')).toBe('attachment; filename=file');
        done();
      }, 1000);
    });

    test('loads file if it exists, mimetype from header', (done): void => {
      buildFSMock(
        { dir: { file: contentBuffer } },
        { 'dir~file': JSON.stringify({ owner: testUser.username, contentType: 'text/plain', meta: { k: 'v' }, size: 12 }) }
      );
      const req = buildDownloadRequest();
      const res = buildResponse();
      req.headers['X-Mimetype'] = 'image/png';
      let piped: Writable | null = null;
      let buffer: Buffer | null = null;
      readableSpy = jest.spyOn(Readable, 'from').mockImplementation((iterable: Iterable<unknown> | AsyncIterable<unknown>) => {
        buffer = iterable as Buffer;
        streamSpy = jest.spyOn(stream, 'pipe').mockImplementation((destination) => {
          piped = destination as typeof res;
          return destination;
        });
        return stream;
      });

      loadHandler(req, res);

      setTimeout(() => {
        expect(buffer).toEqual(contentBuffer);
        expect(piped).toEqual(res);
        expect(res.getHeader('content-length')).toBe(12);
        expect(res.getHeader('content-type')).toBe('image/png');
        expect(res.getHeader('content-disposition')).toBe('attachment; filename=file');
        done();
      }, 1000);
    });

    test('responses error if file does not exist', async (): Promise<void> => {
      const req = buildRequestForFileAction('', 'one', 'dir/file', {});
      const res = buildResponse();

      await loadHandler(req, res);

      assertError(res, 'File dir/file does not exist');
    });
  });

  describe('saveMetaHandler', (): void => {
    test('saves meta', async (): Promise<void> => {
      const data = {
        owner: testUser.username,
        contentType: 'text/plain',
        meta: { k: 'v' }
      };
      buildFSMock({ dir: { file: '' } }, { 'dir~file': JSON.stringify({ owner: testUser.username, contentType: 'text/plain', meta: {} }) });
      const req = buildRequestForFileAction('', 'save-meta', 'dir/file', { meta: { k: 'v' } });
      const res = buildResponse();

      await saveMetaHandler(req, res);

      expect(JSON.parse(await fs.readFile('./data/dir~file', 'utf8'))).toEqual(data);
      assertOK(res);
    });

    test('returns error if file does not exist', async (): Promise<void> => {
      const req = buildRequestForFileAction('', 'save-meta', 'dir/file', { meta: { k: 'v' } });
      const res = buildResponse();

      await saveMetaHandler(req, res);

      assertError(res, 'File dir/file does not exist');
    });
  });

  describe('loadMetaHandler', (): void => {
    test('loads meta', async (): Promise<void> => {
      buildFSMock({ dir: { file: '' } }, { 'dir~file': JSON.stringify({ owner: testUser.username, contentType: 'text/plain', meta: { k: 'v' } }) });
      const req = buildRequestForFileAction('', 'load-meta', 'dir/file', {});
      const res = buildResponse();

      await loadMetaHandler(req, res);

      assertOK(res, { meta: { k: 'v' } });
    });

    test('loads undefined meta', async (): Promise<void> => {
      buildFSMock({ dir: { file: '' } }, { 'dir~file': JSON.stringify({ owner: testUser.username, contentType: 'text/plain' }) });
      const req = buildRequestForFileAction('', 'load-meta', 'dir/file', {});
      const res = buildResponse();

      await loadMetaHandler(req, res);

      assertOK(res, { meta: {} });
    });

    test('returns error if file does not exist', async (): Promise<void> => {
      const req = buildRequestForFileAction('', 'load-meta', 'dir/file', {});
      const res = buildResponse();

      await loadMetaHandler(req, res);

      assertError(res, 'File dir/file does not exist');
    });
  });

  describe('loadDataHandler', (): void => {
    test('loads data', async (): Promise<void> => {
      const data = { owner: testUser.username, contentType: 'text/plain', size: 12, meta: { k: 'v' } };
      buildFSMock({ dir: { file: 'test content' } }, { 'dir~file': JSON.stringify(data) });
      const req = buildRequestForFileAction('', 'load-data', 'dir/file', {});
      const res = buildResponse();

      await loadDataHandler(req, res);

      assertOK(res, { data });
    });

    test('loads data with undefined meta', async (): Promise<void> => {
      const data = { owner: testUser.username, contentType: 'text/plain', size: 12 };
      buildFSMock({ dir: { file: 'test content' } }, { 'dir~file': JSON.stringify(data) });
      const req = buildRequestForFileAction('', 'load-data', 'dir/file', {});
      const res = buildResponse();

      await loadDataHandler(req, res);

      assertOK(res, { data: { ...data, meta: {} } });
    });

    test('returns error if file does not exist', async (): Promise<void> => {
      const req = buildRequestForFileAction('', 'load-data', 'dir/file', {});
      const res = buildResponse();

      await loadDataHandler(req, res);

      assertError(res, 'File dir/file does not exist');
    });
  });

  describe('copyHandler', (): void => {
    test('copies file, changing the owner', async (): Promise<void> => {
      buildFSMock(
        { dir: { file: contentBuffer } },
        { 'dir~file': JSON.stringify({ owner: testUser.id, contentType: 'text/plain', meta: { k: 'v' } }) }
      );
      const req = buildRequestForFileAction('', 'copy', undefined, { path: 'dir/file', targetPath: 'c/copy', username: 'new' });
      const res = buildResponse();

      await copyHandler(req, res);

      expect(await exists('./files/dir/file')).toBe(true);
      expect(await exists('./data/dir~file')).toBe(true);
      expect(await exists('./files/c/copy')).toBe(true);
      expect(await exists('./data/c~copy')).toBe(true);
      expect(await fs.readFile('./files/c/copy', 'utf8')).toBe('test content');
      expect(JSON.parse(await fs.readFile('./data/c~copy', 'utf8'))).toEqual({
        owner: testUser.id,
        contentType: 'text/plain',
        meta: { k: 'v' }
      });
      assertOK(res, { path: 'c/copy' });
    });

    test('copies file, keeping the owner', async (): Promise<void> => {
      buildFSMock(
        { dir: { file: contentBuffer } },
        { 'dir~file': JSON.stringify({ owner: testUser.username, contentType: 'text/plain', meta: { k: 'v' } }) }
      );
      const req = buildRequestForFileAction('', 'copy', undefined, { path: 'dir/file', targetPath: 'c/copy', username: 'new', copyOwner: true });
      const res = buildResponse();

      await copyHandler(req, res);

      expect(JSON.parse(await fs.readFile('./data/c~copy', 'utf8'))).toEqual({
        owner: testUser.username,
        contentType: 'text/plain',
        meta: { k: 'v' }
      });
      assertOK(res, { path: 'c/copy' });
    });

    test('copies file, without jailbreak', async (): Promise<void> => {
      buildFSMock(
        { dir: { file: contentBuffer } },
        { 'dir~file': JSON.stringify({ owner: testUser.username, contentType: 'text/plain', meta: { k: 'v' } }) }
      );
      const req = buildRequestForFileAction('', 'copy', undefined, {
        path: '../dir/file',
        targetPath: '../c/copy',
        username: 'new',
        copyOwner: true
      });
      const res = buildResponse();

      await copyHandler(req, res);

      expect(JSON.parse(await fs.readFile('./data/c~copy', 'utf8'))).toEqual({
        owner: testUser.username,
        contentType: 'text/plain',
        meta: { k: 'v' }
      });
      assertOK(res, { path: 'c/copy' });
    });

    test('returns error if file does not exist', async (): Promise<void> => {
      const req = buildRequestForFileAction('', 'copy', undefined, { path: 'dir/file', targetPath: 'c/copy' });
      const res = buildResponse();

      await copyHandler(req, res);

      assertError(res, 'File dir/file does not exist');
    });
  });

  describe('moveHandler', (): void => {
    test('moves file, changing the owner', async (): Promise<void> => {
      buildFSMock(
        { dir: { file: contentBuffer } },
        { 'dir~file': JSON.stringify({ owner: testUser.id, contentType: 'text/plain', meta: { k: 'v' } }) }
      );
      const req = buildRequestForFileAction('', 'move', undefined, { path: 'dir/file', targetPath: 'm/move', username: 'new' });
      const res = buildResponse();

      await moveHandler(req, res);

      expect(await exists('./files/dir/file')).toBe(false);
      expect(await exists('./data/dir~file')).toBe(false);
      expect(await exists('./files/m/move')).toBe(true);
      expect(await exists('./data/m~move')).toBe(true);
      expect(await fs.readFile('./files/m/move', 'utf8')).toBe('test content');
      expect(JSON.parse(await fs.readFile('./data/m~move', 'utf8'))).toEqual({
        owner: testUser.id,
        contentType: 'text/plain',
        meta: { k: 'v' }
      });
      assertOK(res, { path: 'm/move' });
    });

    test('moves file, keeping the owner', async (): Promise<void> => {
      buildFSMock(
        { dir: { file: contentBuffer } },
        { 'dir~file': JSON.stringify({ owner: testUser.username, contentType: 'text/plain', meta: { k: 'v' } }) }
      );
      const req = buildRequestForFileAction('', 'move', undefined, { path: 'dir/file', targetPath: 'm/move', username: 'new', copyOwner: true });
      const res = buildResponse();

      await moveHandler(req, res);

      expect(JSON.parse(await fs.readFile('./data/m~move', 'utf8'))).toEqual({
        owner: testUser.username,
        contentType: 'text/plain',
        meta: { k: 'v' }
      });
      assertOK(res, { path: 'm/move' });
    });

    test('moves file, without jailbreak', async (): Promise<void> => {
      buildFSMock(
        { dir: { file: contentBuffer } },
        { 'dir~file': JSON.stringify({ owner: testUser.username, contentType: 'text/plain', meta: { k: 'v' } }) }
      );
      const req = buildRequestForFileAction('', 'move', undefined, {
        path: '../dir/file',
        targetPath: '../m/move',
        username: 'new',
        copyOwner: true
      });
      const res = buildResponse();

      await moveHandler(req, res);

      expect(JSON.parse(await fs.readFile('./data/m~move', 'utf8'))).toEqual({
        owner: testUser.username,
        contentType: 'text/plain',
        meta: { k: 'v' }
      });
      assertOK(res, { path: 'm/move' });
    });

    test('returns error if file does not exist', async (): Promise<void> => {
      const req = buildRequestForFileAction('', 'move', undefined, { path: 'dir/file', targetPath: 'm/move' });
      const res = buildResponse();

      await moveHandler(req, res);

      assertError(res, 'File dir/file does not exist');
    });
  });

  describe('deleteHandler', (): void => {
    test('deletes file', async (): Promise<void> => {
      buildFSMock(
        { dir: { file: contentBuffer } },
        { 'dir~file': JSON.stringify({ owner: testUser.username, contentType: 'text/plain', meta: { k: 'v' } }) }
      );
      const req = buildRequestForFileAction('', 'delete', 'dir/file', {});
      const res = buildResponse();

      await deleteHandler(req, res);

      expect(await exists('./files/dir/file')).toBe(false);
      expect(await exists('./data/dir~file')).toBe(false);
      assertOK(res);
    });

    test('returns error if file does not exist', async (): Promise<void> => {
      const req = buildRequestForFileAction('', 'delete', 'dir/file', {});
      const res = buildResponse();

      await deleteHandler(req, res);

      assertError(res, 'File dir/file does not exist');
    });
  });

  describe('listHandler', (): void => {
    test('lists items', async (): Promise<void> => {
      buildFSMock({ dir: { file2: '', dir2: {}, dir1: {}, file1: '' } }, {});
      const req = buildRequestForFileAction('', 'list', 'dir', {});
      const res = buildResponse();

      await listHandler(req, res);

      assertOK(res, { items: ['dir1/', 'dir2/', 'file1', 'file2'] });
    });

    test('lists items, root', async (): Promise<void> => {
      buildFSMock({ file2: '', dir2: {}, dir1: {}, file1: '' }, {});
      const req = buildRequestForFileAction('', 'list', undefined, {});
      const res = buildResponse();

      await listHandler(req, res);

      assertOK(res, { items: ['dir1/', 'dir2/', 'file1', 'file2'] });
    });

    test('returns error if directory does not exist', async (): Promise<void> => {
      const req = buildRequestForFileAction('', 'list', 'dir', {});
      const res = buildResponse();

      await listHandler(req, res);

      assertError(res, 'Directory dir does not exist');
    });
  });

  describe('fileExistsHandler', (): void => {
    test('says, file exists, if it exists.', async (): Promise<void> => {
      buildFSMock({ dir: { file: '' } }, {});
      const req = buildRequestForFileAction('', 'list', 'dir/file', {});
      const res = buildResponse();

      await fileExistsHandler(req, res);

      assertOK(res, { path: 'dir/file', exists: true });
    });

    test('says, file does not exist, if it does not exist.', async (): Promise<void> => {
      buildFSMock({ dir: { file: '' } }, {});
      const req = buildRequestForFileAction('', 'list', 'dir/other', {});
      const res = buildResponse();

      await fileExistsHandler(req, res);

      assertOK(res, { path: 'dir/other', exists: false });
    });
  });

  describe('directoryExistsHandler', (): void => {
    test('says, directory exists, if it exists.', async (): Promise<void> => {
      buildFSMock({ dir: { file: '' } }, {});
      const req = buildRequestForFileAction('', 'list', 'dir', {});
      const res = buildResponse();

      await directoryExistsHandler(req, res);

      assertOK(res, { path: 'dir', exists: true });
    });

    test('says, directory does not exist, if it does not exist.', async (): Promise<void> => {
      buildFSMock({ dir: { file: '' } }, {});
      const req = buildRequestForFileAction('', 'list', 'other', {});
      const res = buildResponse();

      await directoryExistsHandler(req, res);

      assertOK(res, { path: 'other', exists: false });
    });
  });
});
