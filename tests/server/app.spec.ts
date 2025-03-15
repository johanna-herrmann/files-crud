import paths from 'path';
import fs from 'fs/promises';
import express from 'express';
import joi, { ObjectSchema, PartialSchemaMap } from 'joi';
import request from 'supertest';
import mockFS from 'mock-fs';
import { buildApp } from '@/server/app';
import { getConfig, loadConfig, NEW_CONFIG_FILE_PATH } from '@/config/config';
import { reloadStorage } from '@/storage';
import { Logger } from '@/logging/Logger';
import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import { testUser } from '#/testItems';
import { initKeys } from '@/user/jwt';
import { exists } from '#/utils';
import { DirectoryItem } from 'mock-fs/lib/filesystem';
import { setControlToken } from '@/server/middleware/control';
import { AccessLogEntry } from '@/types/logging/AccessLogEntry';
import { Request } from '@/types/server/Request';
import { User } from '@/types/user/User';

let mocked_lastLogEntry: Omit<AccessLogEntry, 'timestamp'> | null = null;

jest.mock('@/logging/index', () => {
  // noinspection JSUnusedGlobalSymbols
  const logger = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    debug(_: string, __?: Record<string, unknown>): Logger {
      return this;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    info(_: string, __?: Record<string, unknown>): Logger {
      return this;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    warn(_: string, __?: Record<string, unknown>): Logger {
      return this;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    error(_: string, __?: Record<string, unknown>): Logger {
      return this;
    },
    access(entry: Omit<AccessLogEntry, 'timestamp'>): Logger {
      mocked_lastLogEntry = entry;
      return this;
    }
  } as Logger;
  return {
    resetLogger() {},
    loadLogger(): Logger {
      return logger;
    },
    getLogger(): Logger {
      return logger;
    },
    reloadLogger() {}
  };
});

jest.mock('@/user/auth', () => {
  const actual = jest.requireActual('@/user/auth');
  return {
    ...actual,
    async authorize(token: string): Promise<User | null> {
      if (token === 'valid_admin_token') {
        return { ...testUser, admin: true };
      }
      if (token === 'valid_user_token') {
        return { ...testUser, admin: false };
      }
      return await actual.authorize(token);
    }
  };
});

describe('app->buildApp', (): void => {
  beforeEach(async (): Promise<void> => {
    loadConfig();
    data.user_ = [];
  });

  afterEach(async (): Promise<void> => {
    data.user_ = [];
    loadConfig();
    mocked_lastLogEntry = null;
  });

  describe('common middlewares', () => {
    test('Handles json correctly.', async (): Promise<void> => {
      const testBody = { someKey: 'someValue' };
      const app = buildApp(true);
      app.post('/test', (req: Request, res: express.Response) => {
        res.status(200).json(req.body);
      });

      const response = await request(app).post('/test').send(testBody);

      expect(response.statusCode).toEqual(200);
      expect(response.body).toEqual(testBody);
      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    });

    test('Logs access correctly.', async (): Promise<void> => {
      const app = buildApp(true);
      app.get('/test', (req: Request, res: express.Response) => {
        res.status(200).json(req.body);
      });

      const response = await request(app).get('/test');

      const { time, ...rest } = mocked_lastLogEntry ?? { time: -1 };
      // noinspection SpellCheckingInspection
      expect(rest).toEqual({
        ip: '::ffff:_',
        method: 'GET',
        path: '/test',
        httpVersion: 'HTTP/1.1',
        statusCode: 200,
        contentLength: undefined,
        referer: '_',
        userAgent: '_'
      });
      expect(time).toBeGreaterThanOrEqual(0);
      expect(time).toBeLessThanOrEqual(1000);
      expect(response.statusCode).toEqual(200);
      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    });

    test('Falls back to 404 if resource does not exist in given webRoot.', async (): Promise<void> => {
      loadConfig({ webRoot: __dirname });
      const app = buildApp(true);

      const response = await request(app).get('/does-not-exist');

      expect(response.statusCode).toEqual(404);
    });

    test('Falls back to 404 if no webroot given.', async (): Promise<void> => {
      const app = buildApp(true);
      const path = `/${paths.basename(__filename)}`;

      const response = await request(app).get(path);

      expect(response.statusCode).toEqual(404);
    });
  });

  describe('Handles user routes correctly', (): void => {
    test('register', async (): Promise<void> => {
      loadConfig({ register: 'all' });
      const app = buildApp();

      const res = await request(app).post('/api/register').send({ username: 'testUsername', password: '12345678' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ username: 'testUsername' });
      expect((data.user_?.at(0) as User)?.username).toBe('testUsername');
    });

    test('login', async (): Promise<void> => {
      await initKeys();
      data.user_[0] = { ...testUser, salt: 'bOLMqOWRywU76vfL7aZJrA==', hash: 'ZOsk/fKrGTK2NIOcESgSnpE/OYynVTtSovnP8EIJinQ=' };
      const app = buildApp();

      const res = await request(app).post('/api/login').send({ username: testUser.username, password: '12345678' });

      expect(res.statusCode).toBe(200);
      expect(res.body?.token).toMatch(/^ey.*$/);
      expect(res.body?.expiresAt).toBeGreaterThanOrEqual(1);
    });

    test('addUser', async (): Promise<void> => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/user/add')
        .auth('valid_admin_token', { type: 'bearer' })
        .send({ username: 'username', password: 'password' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ username: 'username' });
      expect((data.user_?.at(0) as User)?.username).toBe('username');
    });

    test('setAdmin', async (): Promise<void> => {
      data.user_[0] = { ...testUser, admin: true };
      const app = buildApp();

      const res = await request(app).post('/api/user/set-admin').auth('valid_admin_token', { type: 'bearer' }).send({ id: 'self', admin: false });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({});
      expect((data.user_?.at(0) as User)?.admin).toBe(false);
    });

    test('changeUsername', async (): Promise<void> => {
      data.user_[0] = { ...testUser, admin: true };
      const app = buildApp();

      const res = await request(app)
        .post('/api/user/change-username')
        .auth('valid_admin_token', { type: 'bearer' })
        .send({ id: 'self', newUsername: 'newU' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ username: 'newU' });
      expect((data.user_?.at(0) as User)?.username).toBe('newU');
    });

    test('changePassword', async (): Promise<void> => {
      data.user_[0] = { ...testUser, admin: false, salt: 'bOLMqOWRywU76vfL7aZJrA==', hash: 'ZOsk/fKrGTK2NIOcESgSnpE/OYynVTtSovnP8EIJinQ=' };
      const app = buildApp();

      const res = await request(app)
        .post('/api/user/change-password')
        .auth('valid_user_token', { type: 'bearer' })
        .send({ id: 'self', newPassword: 'newPassword', oldPassword: '12345678' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({});
      expect((data.user_?.at(0) as User)?.hash).not.toBe('ZOsk/fKrGTK2NIOcESgSnpE/OYynVTtSovnP8EIJinQ=');
    });

    test('saveMeta', async (): Promise<void> => {
      data.user_[0] = { ...testUser, admin: true };
      const app = buildApp();

      const res = await request(app)
        .post(`/api/user/save-meta/${testUser.id}`)
        .auth('valid_admin_token', { type: 'bearer' })
        .send({ meta: { k: 'v' } });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({});
      expect((data.user_?.at(0) as User)?.meta).toEqual({ k: 'v' });
    });

    test('remove', async (): Promise<void> => {
      data.user_[0] = { ...testUser, admin: false };
      const app = buildApp();

      const res = await request(app).delete(`/api/user/remove/${testUser.id}`).auth('valid_user_token', { type: 'bearer' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({});
      expect(data.user_?.length ?? 0).toBe(0);
    });

    test('load-meta', async (): Promise<void> => {
      data.user_[0] = { ...testUser, admin: false, meta: { k: 'v' } };
      const app = buildApp();

      const res = await request(app).get(`/api/user/load-meta/${testUser.id}`).auth('valid_user_token', { type: 'bearer' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ meta: { k: 'v' } });
    });

    test('load', async (): Promise<void> => {
      data.user_[0] = { ...testUser, admin: false, meta: { k: 'v' } };
      const app = buildApp();

      const res = await request(app).get(`/api/user/load/${testUser.id}`).auth('valid_user_token', { type: 'bearer' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ user: { id: testUser.id, username: testUser.username, meta: { k: 'v' }, admin: false } });
    });

    test('list', async (): Promise<void> => {
      data.user_[0] = { ...testUser, admin: false };
      data.user_[1] = { ...testUser, admin: true, username: 'user2', id: 'id2' };
      const app = buildApp();

      const res = await request(app).get('/api/user/list').auth('valid_admin_token', { type: 'bearer' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        users: [
          { admin: false, id: testUser.id, username: testUser.username },
          { admin: true, id: 'id2', username: 'user2' }
        ]
      });
    });
  });

  describe('handles file routes correctly', (): void => {
    const prepareStorage = function (data: DirectoryItem, files: DirectoryItem): void {
      const nodeModulesPath = `${paths.dirname(paths.dirname(__dirname))}/node_modules/`;
      mockFS({ [nodeModulesPath]: mockFS.load(nodeModulesPath, { recursive: true }), '/base': { data, files } });
      loadConfig({ defaultPermissions: 'fff', storage: { name: 'fs', path: '/base' } });
      reloadStorage();
    };

    beforeEach(async () => {
      prepareStorage({}, {});
    });

    afterEach(async () => {
      mockFS.restore();
      loadConfig();
    });

    test('upload', async (): Promise<void> => {
      const app = buildApp();

      const res = await request(app).post('/api/file/upload/dir/file').attach('file', Buffer.from('abc', 'utf8'));

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ path: 'dir/file' });
      expect(await exists('/base/data/dir/file')).toBe(true);
    });

    test('saveFileMeta', async (): Promise<void> => {
      prepareStorage({ file: JSON.stringify({ key: 'ke/key' }) }, { ke: { key: '' } });
      const app = buildApp();

      const res = await request(app)
        .post('/api/file/save-meta/file')
        .send({ meta: { k: 'v' } });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({});
      expect(await exists('/base/data/file')).toBe(true);
      expect(JSON.parse(await fs.readFile('/base/data/file', 'utf8')).meta).toEqual({ k: 'v' });
    });

    test('copyFile', async (): Promise<void> => {
      prepareStorage({ file: JSON.stringify({ key: 'ke/key' }) }, { ke: { key: '' } });
      const app = buildApp();

      const res = await request(app).post('/api/file/copy').send({ path: 'file', targetPath: 'copy' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ path: 'copy' });
      expect(await exists('/base/data/copy')).toBe(true);
    });

    test('moveFile', async (): Promise<void> => {
      prepareStorage({ file: JSON.stringify({ key: 'ke/key' }) }, { ke: { key: '' } });
      const app = buildApp();

      const res = await request(app).post('/api/file/move').send({ path: 'file', targetPath: 'move' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ path: 'move' });
      expect(await exists('/base/data/move')).toBe(true);
    });

    test('removeFile', async (): Promise<void> => {
      prepareStorage({ file: JSON.stringify({ key: 'ke/key' }) }, { ke: { key: '' } });
      const app = buildApp();

      const res = await request(app).delete('/api/file/remove/file');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({});
      expect(await exists('/base/data/file')).toBe(false);
    });

    test('loadFileMeta', async (): Promise<void> => {
      prepareStorage({ file: JSON.stringify({ key: 'ke/key', meta: { k: 'v' } }) }, { ke: { key: '' } });
      const app = buildApp();

      const res = await request(app).get('/api/file/load-meta/file');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ meta: { k: 'v' } });
    });

    test('loadFileData', async (): Promise<void> => {
      prepareStorage({ file: JSON.stringify({ key: 'ke/key', meta: { k: 'v' }, md5: 'testMD5' }) }, { ke: { key: '' } });
      const app = buildApp();

      const res = await request(app).get('/api/file/load-data/file');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ data: { meta: { k: 'v' }, md5: 'testMD5' } });
    });

    test('download', async (): Promise<void> => {
      prepareStorage({ 'test.txt': JSON.stringify({ key: 'ke/key', contentType: 'text/plain', size: 12 }) }, { ke: { key: 'test content' } });
      const app = buildApp();

      const res = await request(app)
        .get('/api/file/download/test.txt')
        .buffer()
        .parse((res, callback) => {
          res.setEncoding('binary');
          (res as unknown as Record<string, unknown>).data = '';
          res.on('data', (chunk) => {
            (res as unknown as Record<string, unknown>).data += chunk;
          });
          res.on('end', () => {
            callback(null, Buffer.from((res as unknown as Record<string, unknown>).data as string, 'binary'));
          });
        });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/plain');
      expect(res.headers['content-length']).toBe('12');
      expect(res.headers['content-disposition']).toBe('attachment; filename=test.txt');
      expect(res.body).toEqual(Buffer.from('test content', 'utf8'));
    });

    test('listDirectory', async (): Promise<void> => {
      prepareStorage({ dir: { file: JSON.stringify({ key: 'ke/key' }), file2: JSON.stringify({ key: 'ke/key2' }) } }, { ke: { key: '', key2: '' } });
      const app = buildApp();

      const res = await request(app).get('/api/file/list/dir');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ items: ['file', 'file2'] });
    });

    test('listDirectory, root', async (): Promise<void> => {
      prepareStorage({ dir: {}, file: JSON.stringify({ key: 'ke/key' }), file2: JSON.stringify({ key: 'ke/key2' }) }, { ke: { key: '', key2: '' } });
      const app = buildApp();

      const res = await request(app).get('/api/file/list/');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ items: ['dir/', 'file', 'file2'] });
    });

    test('file-exists', async (): Promise<void> => {
      prepareStorage({ file: JSON.stringify({ key: 'ke/key' }) }, { ke: { key: '', key2: '' } });
      const app = buildApp();

      const res = await request(app).get('/api/file/file-exists/file');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ path: 'file', exists: true });
    });

    test('directory-exists', async (): Promise<void> => {
      prepareStorage({ dir: {} }, {});
      const app = buildApp();

      const res = await request(app).get('/api/file/directory-exists/dir');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ path: 'dir', exists: true });
    });
  });

  describe('handles control routes correctly', (): void => {
    let exitSpy: jest.Spied<typeof process.exit>;
    let fsReadSpy: jest.Spied<typeof fs.readFile>;
    let fsUnlinkSpy: jest.Spied<typeof fs.readFile>;

    afterEach(async (): Promise<void> => {
      exitSpy?.mockRestore();
      fsReadSpy?.mockRestore();
      fsUnlinkSpy?.mockRestore();
    });

    test('stop', async (): Promise<void> => {
      let exitCode = -1;
      // @ts-expect-error this is fine
      exitSpy = jest.spyOn(process, 'exit').mockImplementation((code: number) => {
        exitCode = code as number;
      });
      setControlToken('testControlToken');
      const app = buildApp();

      const res = await request(app).post('/control/stop').auth('testControlToken', { type: 'bearer' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({});
      expect(exitCode).toBe(0);
    });

    test('reload', async (): Promise<void> => {
      let deleted = '';
      // @ts-expect-error this is fine
      fsReadSpy = jest.spyOn(fs, 'readFile').mockImplementation(async (path: string, encoding: string): string => {
        if (path === NEW_CONFIG_FILE_PATH && encoding.replace('-', '').toLowerCase() === 'utf8') {
          return JSON.stringify({ register: 'all' });
        }
        return '';
      });
      // @ts-expect-error this is fine
      fsUnlinkSpy = jest.spyOn(fs, 'unlink').mockImplementation(async (path: string) => {
        if (path === NEW_CONFIG_FILE_PATH) {
          deleted = NEW_CONFIG_FILE_PATH;
        }
      });
      setControlToken('testControlToken');
      const app = buildApp();

      const res = await request(app).post('/control/reload').auth('testControlToken', { type: 'bearer' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({});
      expect(getConfig()).toEqual({ register: 'all' });
      expect(deleted).toBe(NEW_CONFIG_FILE_PATH);
    });
  });

  describe('staticMiddleware', (): void => {
    test('sends this file via static middleware', async (): Promise<void> => {
      loadConfig({ webRoot: __dirname });
      const app = buildApp();

      const res = await request(app).get(`/${paths.basename(__filename)}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(await fs.readFile(__filename));
    });

    test('falls through until notFound middleware', async (): Promise<void> => {
      loadConfig({ webRoot: __dirname });
      const app = buildApp();

      const res = await request(app).get('/nope');

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: 'Cannot GET /nope' });
    });
  });

  describe('handles 404 correctly', (): void => {
    test('with fallback 404', async (): Promise<void> => {
      const app = buildApp();

      const res = await request(app).get('/nope');

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: 'Cannot GET /nope' });
    });
  });

  describe('handles unexpected error correctly', (): void => {
    let expressJsonSpy: jest.Spied<typeof express.json>;
    let joiSpy: jest.Spied<typeof joi.object>;

    afterEach(async (): Promise<void> => {
      expressJsonSpy?.mockRestore();
      joiSpy?.mockRestore();
    });

    test('on synchronous handler', async (): Promise<void> => {
      jest.spyOn(express, 'json').mockImplementation(() => {
        return function () {
          throw new Error('test error');
        };
      });
      const app = buildApp();

      const res = await request(app).post('/api/login').send({});

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'Error. Unexpected Error.' });
    });

    test('on asynchronous handler', async (): Promise<void> => {
      jest.spyOn(joi, 'object').mockImplementation((schema?: PartialSchemaMap<unknown> | undefined): ObjectSchema<unknown> => {
        if ('username' in (schema ?? {})) {
          throw new Error('test error');
        }
        // noinspection JSUnusedGlobalSymbols
        const objectSchema = {
          validate(value: Record<string, unknown>) {
            return { value };
          }
        };
        return objectSchema as unknown as ObjectSchema<unknown>;
      });
      const app = buildApp();

      const res = await request(app).post('/api/login').send({ username: 'username', password: 'password' });

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'Error. Unexpected Error.' });
    });
  });
});
