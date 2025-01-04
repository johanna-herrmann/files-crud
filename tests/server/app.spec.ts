import Request from '@/types/server/Request';
import express from 'express';
import request from 'supertest';
import paths from 'path';
import fs from 'fs/promises';
import { buildApp } from '@/server/app';
import { loadConfig } from '@/config';
import { Logger } from '@/logging/Logger';
import AccessLogEntry from '@/types/logging/AccessLogEntry';
import UploadRequest from '@/types/server/UploadRequest';

let mocked_lastLogEntry: Omit<AccessLogEntry, 'timestamp'> | null = null;

const mocked_lastChain: string[] = [];

jest.mock('@/logging/index', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    resetLogger() {},
    loadLogger(): Logger {
      return {
        access(entry: Omit<AccessLogEntry, 'timestamp'>): Logger {
          mocked_lastLogEntry = entry;
          return this;
        }
      } as Logger;
    }
  };
});

jest.mock('@/server/middleware', () => {
  const actual = jest.requireActual('@/server/middleware');
  const mock: Record<string, (_: Request, __: express.Response, next: express.NextFunction) => void | Promise<void>> = {};
  Object.keys(actual).forEach((key) => {
    mock[key] = (req: Request, res: express.Response, next: express.NextFunction) => {
      mocked_lastChain.push(key);

      if (key === 'logAccessMiddleware') {
        return actual[key](req, res, next);
      }

      next();
    };
  });
  return mock;
});

jest.mock('@/server/handler', () => {
  const actual = jest.requireActual('@/server/handler');
  const mock: Record<string, (req: Request, res: express.Response) => void | Promise<void>> = {};
  Object.keys(actual).forEach((key) => {
    mock[key] = (req: Request, res: express.Response) => {
      mocked_lastChain.push(key);
      res.json({ params: req.params });
    };
  });
  return mock;
});

describe('app', (): void => {
  afterEach(async (): Promise<void> => {
    loadConfig();
    mocked_lastLogEntry = null;
    mocked_lastChain.splice(0, mocked_lastChain.length);
  });

  describe('after addCommonMiddlewares it', () => {
    test('handles json correctly', async (): Promise<void> => {
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

    test('logs access correctly', async (): Promise<void> => {
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
        httpVersion: '1.1',
        statusCode: 200,
        contentLength: 2,
        referer: '_',
        userAgent: '_'
      });
      expect(time).toBeGreaterThanOrEqual(0);
      expect(time).toBeLessThanOrEqual(1000);
      expect(response.statusCode).toEqual(200);
      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    });

    test('serves webroot if given', async (): Promise<void> => {
      loadConfig({ webRoot: __dirname });
      const app = buildApp();
      const path = `/${paths.basename(__filename)}`;

      const response = await request(app).get(path);

      expect(response.statusCode).toEqual(200);
      expect(response.headers['content-type']).toBe('video/mp2t'); // express believes ts file is transport stream file
      expect((response.body as Buffer).toString('utf8')).toMatch(/describe/u);
      expect((response.body as Buffer).toString('utf8')).toMatch(/test/u);
      expect((response.body as Buffer).toString('utf8')).toMatch(/serves webroot if given/u);
    });

    test('falls back to 404 if resource does not exist in given webroot', async (): Promise<void> => {
      loadConfig({ webRoot: __dirname });
      const app = buildApp(true);

      const response = await request(app).get('/does-not-exist');

      expect(response.statusCode).toEqual(404);
    });

    test('falls back to 404 if no webroot given', async (): Promise<void> => {
      const app = buildApp(true);
      const path = `/${paths.basename(__filename)}`;

      const response = await request(app).get(path);

      expect(response.statusCode).toEqual(404);
    });

    test('handles file upload correctly', async (): Promise<void> => {
      const app = buildApp(true);
      app.post('/upload', (req: Request, res: express.Response) => {
        const { data, mimetype } = (req as UploadRequest).files?.file ?? { data: Buffer.from(''), mimetype: '' };
        res.status(200).json({ mimetype, content: data.subarray(0, 16).toString('base64') });
      });
      const content = (await fs.readFile(__filename)).subarray(0, 16).toString('base64');

      const response = await request(app).post('/upload').attach('file', __filename);

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(response.body.content).toBe(content);
      expect(response.body.mimetype).toBe('video/mp2t');
    });
  });

  describe('handles user routes correctly', (): void => {
    test('register', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/register');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'registerMiddleware', 'registerHandler']);
    });

    test('login', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/login');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'loginHandler']);
    });

    test('addUser', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/user/add');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'userMiddleware', 'addUserHandler']);
    });

    test('setAdmin', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/user/set-admin');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'userMiddleware', 'setAdminStateHandler']);
    });

    test('changeUsername', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/user/change-username');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'userMiddleware', 'changeUsernameHandler']);
    });

    test('changePassword', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/user/change-password');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'userMiddleware', 'changePasswordHandler']);
    });

    test('saveMeta', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).post('/user/save-meta/username');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'userMiddleware', 'saveUserMetaHandler']);
      expect(response.body.params).toEqual({ username: 'username' });
    });

    test('delete', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).delete('/user/delete/username');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'userMiddleware', 'deleteUserHandler']);
      expect(response.body.params).toEqual({ username: 'username' });
    });

    test('loadMeta', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/user/load-meta/username');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'userMiddleware', 'loadUserMetaHandler']);
      expect(response.body.params).toEqual({ username: 'username' });
    });

    test('one', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/user/one/username');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'userMiddleware', 'getUserHandler']);
      expect(response.body.params).toEqual({ username: 'username' });
    });

    test('list', async (): Promise<void> => {
      const app = buildApp();

      await request(app).get('/user/list');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'userMiddleware', 'getUsersHandler']);
    });
  });

  describe('handles file routes correctly', (): void => {
    test('saveFile', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).post('/file/save/dir/file');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'fileSaveMiddleware', 'saveFileHandler']);
      expect(response.body.params).toEqual({ path: 'dir', '0': '/file' });
    });

    test('saveFileMeta', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).post('/file/save-meta/dir/file');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'fileSaveMetaMiddleware', 'saveFileMetaHandler']);
      expect(response.body.params).toEqual({ path: 'dir', '0': '/file' });
    });

    test('copyFile', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/file/copy');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'fileCopyMiddleware', 'copyFileHandler']);
    });

    test('moveFile', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/file/move');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'fileMoveMiddleware', 'moveFileHandler']);
    });

    test('deleteFile', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).delete('/file/delete/dir/file');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'fileDeleteMiddleware', 'deleteFileHandler']);
      expect(response.body.params).toEqual({ path: 'dir', '0': '/file' });
    });

    test('loadFileMeta', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/file/load-meta/dir/file');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'fileLoadMetaMiddleware', 'loadFileMetaHandler']);
      expect(response.body.params).toEqual({ path: 'dir', '0': '/file' });
    });

    test('loadFileData', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/file/load-data/dir/file');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'fileLoadDataMiddleware', 'loadFileDataHandler']);
      expect(response.body.params).toEqual({ path: 'dir', '0': '/file' });
    });

    test('loadFile', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/file/one/dir/file');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'fileLoadMiddleware', 'loadFileHandler']);
      expect(response.body.params).toEqual({ path: 'dir', '0': '/file' });
    });

    test('listDirectory', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/file/list/dir/sub');

      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'directoryListingMiddleware', 'listDirectoryItemsHandler']);
      expect(response.body.params).toEqual({ path: 'dir', '0': '/sub' });
    });
  });

  describe('handles 404 correctly', (): void => {
    test('with fallback 404', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/nope');

      expect(response.statusCode).toBe(404);
      expect(mocked_lastChain).toEqual(['logAccessMiddleware', 'notFoundMiddleware']);
    });
  });
});
