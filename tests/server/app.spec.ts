import express from 'express';
import request from 'supertest';
import paths from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { buildApp } from '@/server/app';
import { loadConfig } from '@/config';
import { Logger } from '@/logging/Logger';
import AccessLogEntry from '@/types/logging/AccessLogEntry';
import UploadRequest from '@/types/server/UploadRequest';
import Request from '@/types/server/Request';

type Middleware = (_: Request, __: express.Response, next: express.NextFunction) => void | Promise<void>;
type ErrorMiddleware = (err: Error, _: Request, __: express.Response, next: express.NextFunction) => void | Promise<void>;
type Handler = (req: Request, res: express.Response) => void | Promise<void>;

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
  const mock: Record<string, Middleware | ErrorMiddleware> = {};
  Object.keys(actual).forEach((key) => {
    if (key === 'errorMiddleware') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return (mock[key] = (_: Error, __: Request, res: express.Response, ___: express.NextFunction) => {
        mocked_lastChain.push(key);
        res.status(500).send();
      });
    }
    mock[key] = (req: Request, res: express.Response, next: express.NextFunction) => {
      mocked_lastChain.push(key);

      if (key === 'logAccessMiddleware') {
        return actual[key](req, res, next);
      }

      if (key === 'notFoundMiddleware') {
        return res.status(404).send();
      }

      next();
    };
  });
  return mock;
});

jest.mock('@/server/handler', () => {
  const actual = jest.requireActual('@/server/handler');
  const mock: Record<string, Handler> = {};
  Object.keys(actual).forEach((key) => {
    if (key === 'registerHandler') {
      return (mock[key] = async (req: Request, res: express.Response) => {
        mocked_lastChain.push(key);
        if (!!req.body?.error) {
          throw req.body.error as Error;
        }
        res.json({ params: req.params });
      });
    }
    mock[key] = (req: Request, res: express.Response) => {
      mocked_lastChain.push(key);

      if (key === 'loginHandler' && !!req.body?.error) {
        throw req.body.error as Error;
      }

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
    test('sets headers correctly', async (): Promise<void> => {
      const app = buildApp(true);
      app.get('/test', (req: Request, res: express.Response) => {
        res.status(200).json(req.body);
      });

      await request(app).get('/test');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware']);
    });

    test('handles cors correctly', async (): Promise<void> => {
      loadConfig({ server: { cors: { origin: '*' } } });
      const app = buildApp(true);
      app.get('/test', (req: Request, res: express.Response) => {
        res.status(200).json(req.body);
      });

      const response = await request(app).get('/test');

      expect(response.statusCode).toEqual(200);
      expect(response.headers['access-control-allow-origin']).toBe('*');
    });

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
        contentLength: undefined,
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
        const { data, mimetype, md5 } = (req as UploadRequest).files?.file ?? { data: Buffer.from(''), mimetype: '' };
        res.status(200).json({ mimetype, content: data.subarray(0, 16).toString('base64'), md5 });
      });
      const content = (await fs.readFile(__filename)).subarray(0, 16).toString('base64');

      const response = await request(app).post('/upload').attach('file', __filename);

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(response.body.content).toBe(content);
      expect(response.body.md5).toBe(
        crypto
          .createHash('md5')
          .update(await fs.readFile(__filename))
          .digest()
          .toString('hex')
      );
      expect(response.body.mimetype).toBe('video/mp2t');
    });
  });

  describe('handles user routes correctly', (): void => {
    test('register', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/register');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'registerMiddleware', 'registerHandler']);
    });

    test('login', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/login');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'loginHandler']);
    });

    test('addUser', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/user/add');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'userMiddleware', 'addUserHandler']);
    });

    test('setAdmin', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/user/set-admin');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'userMiddleware', 'setAdminStateHandler']);
    });

    test('changeUsername', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/user/change-username');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'userMiddleware', 'changeUsernameHandler']);
    });

    test('changePassword', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/user/change-password');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'userMiddleware', 'changePasswordHandler']);
    });

    test('saveMeta', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).post('/user/save-meta/username');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'userMiddleware', 'saveUserMetaHandler']);
      expect(response.body.params).toEqual({ username: 'username' });
    });

    test('delete', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).delete('/user/delete/username');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'userMiddleware', 'deleteUserHandler']);
      expect(response.body.params).toEqual({ username: 'username' });
    });

    test('loadMeta', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/user/load-meta/username');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'userMiddleware', 'loadUserMetaHandler']);
      expect(response.body.params).toEqual({ username: 'username' });
    });

    test('one', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/user/one/username');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'userMiddleware', 'getUserHandler']);
      expect(response.body.params).toEqual({ username: 'username' });
    });

    test('list', async (): Promise<void> => {
      const app = buildApp();

      await request(app).get('/user/list');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'userMiddleware', 'getUsersHandler']);
    });
  });

  describe('handles file routes correctly', (): void => {
    test('saveFile', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).post('/file/save/dir/file');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'fileSaveMiddleware', 'saveFileHandler']);
      expect(response.body.params).toEqual({ path: ['dir', 'file'] });
    });

    test('saveFileMeta', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).post('/file/save-meta/dir/file');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'fileSaveMetaMiddleware', 'saveFileMetaHandler']);
      expect(response.body.params).toEqual({ path: ['dir', 'file'] });
    });

    test('copyFile', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/file/copy');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'fileCopyMiddleware', 'copyFileHandler']);
    });

    test('moveFile', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/file/move');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'fileMoveMiddleware', 'moveFileHandler']);
    });

    test('deleteFile', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).delete('/file/delete/dir/file');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'fileDeleteMiddleware', 'deleteFileHandler']);
      expect(response.body.params).toEqual({ path: ['dir', 'file'] });
    });

    test('loadFileMeta', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/file/load-meta/dir/file');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'fileLoadMetaMiddleware', 'loadFileMetaHandler']);
      expect(response.body.params).toEqual({ path: ['dir', 'file'] });
    });

    test('loadFileData', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/file/load-data/dir/file');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'fileLoadDataMiddleware', 'loadFileDataHandler']);
      expect(response.body.params).toEqual({ path: ['dir', 'file'] });
    });

    test('loadFile', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/file/one/dir/file');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'fileLoadMiddleware', 'loadFileHandler']);
      expect(response.body.params).toEqual({ path: ['dir', 'file'] });
    });

    test('listDirectory', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/file/list/dir/sub');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'directoryListingMiddleware', 'listDirectoryItemsHandler']);
      expect(response.body.params).toEqual({ path: ['dir', 'sub'] });
    });
  });

  describe('handles 404 correctly', (): void => {
    test('with fallback 404', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/nope');

      expect(response.statusCode).toBe(404);
      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'notFoundMiddleware']);
    });
  });

  describe('handles unexpected error correctly', (): void => {
    test('on synchronous handler', async (): Promise<void> => {
      const error = new Error('test error');
      const app = buildApp();

      const response = await request(app).post('/login').send({ error });

      expect(response.statusCode).toBe(500);
      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'loginHandler', 'errorMiddleware']);
    });

    test('on asynchronous handler', async (): Promise<void> => {
      const error = new Error('test error');
      const app = buildApp();

      const response = await request(app).post('/register').send({ error });

      expect(response.statusCode).toBe(500);
      expect(mocked_lastChain).toEqual(['headerMiddleware', 'logAccessMiddleware', 'registerMiddleware', 'registerHandler', 'errorMiddleware']);
    });
  });
});
