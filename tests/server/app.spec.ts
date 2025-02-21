import paths from 'path';
import express from 'express';
import request from 'supertest';
import { buildApp } from '@/server/app';
import { loadConfig } from '@/config/config';
import { Logger } from '@/logging/Logger';
import AccessLogEntry from '@/types/logging/AccessLogEntry';
import Request from '@/types/server/Request';

type Middleware = (_: Request, __: express.Response, next: express.NextFunction) => void | Promise<void>;
type ErrorMiddleware = (err: Error, _: Request, __: express.Response, next: express.NextFunction) => void | Promise<void>;
type Handler = (req: Request, res: express.Response) => void | Promise<void>;

let mocked_lastLogEntry: Omit<AccessLogEntry, 'timestamp'> | null = null;

const mocked_lastChain: string[] = [];
let mocked_lastAction = '';
let mocked_lastId = '';

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

      if (key === 'userMiddleware') {
        mocked_lastAction = (req.params as Record<string, string>).action;
        mocked_lastId = (req.params as Record<string, string>).id;
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

describe('app->buildApp', (): void => {
  afterEach(async (): Promise<void> => {
    loadConfig();
    mocked_lastLogEntry = null;
    mocked_lastAction = '';
    mocked_lastId = '';
    mocked_lastChain.splice(0, mocked_lastChain.length);
  });

  describe('common middlewares', () => {
    test('Calls common middlewares in correct order.', async (): Promise<void> => {
      const app = buildApp();

      await request(app).get('/nope');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'staticMiddleware', 'notFoundMiddleware']);
    });

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
      const app = buildApp();

      await request(app).post('/api/register');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'registerMiddleware', 'registerHandler']);
    });

    test('login', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/api/login');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'loginHandler']);
    });

    test('addUser', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/api/user/add');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'userMiddleware', 'addUserHandler']);
      expect(mocked_lastAction).toBe('add');
    });

    test('setAdmin', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/api/user/set-admin');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'userMiddleware', 'setAdminStateHandler']);
      expect(mocked_lastAction).toBe('set-admin');
    });

    test('changeUsername', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/api/user/change-username');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'userMiddleware', 'changeUsernameHandler']);
      expect(mocked_lastAction).toBe('change-username');
    });

    test('changePassword', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/api/user/change-password');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'userMiddleware', 'changePasswordHandler']);
      expect(mocked_lastAction).toBe('change-password');
    });

    test('saveMeta', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).post('/api/user/save-meta/id');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'userMiddleware', 'saveUserMetaHandler']);
      expect(mocked_lastAction).toBe('save-meta');
      expect(mocked_lastId).toBe('id');
      expect(response.body.params).toEqual({ id: 'id' });
    });

    test('remove', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).delete('/api/user/remove/id');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'userMiddleware', 'deleteUserHandler']);
      expect(mocked_lastAction).toBe('remove');
      expect(mocked_lastId).toBe('id');
      expect(response.body.params).toEqual({ id: 'id' });
    });

    test('loadMeta', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/api/user/load-meta/id');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'userMiddleware', 'loadUserMetaHandler']);
      expect(mocked_lastAction).toBe('load-meta');
      expect(mocked_lastId).toBe('id');
      expect(response.body.params).toEqual({ id: 'id' });
    });

    test('load', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/api/user/load/id');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'userMiddleware', 'getUserHandler']);
      expect(mocked_lastAction).toBe('load');
      expect(mocked_lastId).toBe('id');
      expect(response.body.params).toEqual({ id: 'id' });
    });

    test('list', async (): Promise<void> => {
      const app = buildApp();

      await request(app).get('/api/user/list');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'userMiddleware', 'getUsersHandler']);
      expect(mocked_lastAction).toBe('list');
    });
  });

  describe('handles file routes correctly', (): void => {
    test('upload', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).post('/api/file/upload/dir/file');

      expect(mocked_lastChain).toEqual([
        'headerMiddleware',
        'corsMiddleware',
        'logAccessMiddleware',
        'fileSaveMiddleware',
        'uploadFileMiddleware',
        'saveFileHandler'
      ]);
      expect(response.body.params).toEqual({ path: ['dir', 'file'] });
    });

    test('saveFileMeta', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).post('/api/file/save-meta/dir/file');

      expect(mocked_lastChain).toEqual([
        'headerMiddleware',
        'corsMiddleware',
        'logAccessMiddleware',
        'fileSaveMetaMiddleware',
        'saveFileMetaHandler'
      ]);
      expect(response.body.params).toEqual({ path: ['dir', 'file'] });
    });

    test('copyFile', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/api/file/copy');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'fileCopyMiddleware', 'copyFileHandler']);
    });

    test('moveFile', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/api/file/move');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'fileMoveMiddleware', 'moveFileHandler']);
    });

    test('removeFile', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).delete('/api/file/remove/dir/file');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'fileDeleteMiddleware', 'deleteFileHandler']);
      expect(response.body.params).toEqual({ path: ['dir', 'file'] });
    });

    test('loadFileMeta', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/api/file/load-meta/dir/file');

      expect(mocked_lastChain).toEqual([
        'headerMiddleware',
        'corsMiddleware',
        'logAccessMiddleware',
        'fileLoadMetaMiddleware',
        'loadFileMetaHandler'
      ]);
      expect(response.body.params).toEqual({ path: ['dir', 'file'] });
    });

    test('loadFileData', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/api/file/load-data/dir/file');

      expect(mocked_lastChain).toEqual([
        'headerMiddleware',
        'corsMiddleware',
        'logAccessMiddleware',
        'fileLoadDataMiddleware',
        'loadFileDataHandler'
      ]);
      expect(response.body.params).toEqual({ path: ['dir', 'file'] });
    });

    test('download', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/api/file/download/dir/file');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'fileLoadMiddleware', 'loadFileHandler']);
      expect(response.body.params).toEqual({ path: ['dir', 'file'] });
    });

    test('listDirectory', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/api/file/list/dir/sub');

      expect(mocked_lastChain).toEqual([
        'headerMiddleware',
        'corsMiddleware',
        'logAccessMiddleware',
        'directoryListingMiddleware',
        'listDirectoryItemsHandler'
      ]);
      expect(response.body.params).toEqual({ path: ['dir', 'sub'] });
    });

    test('listDirectory, root', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/api/file/list/');

      expect(mocked_lastChain).toEqual([
        'headerMiddleware',
        'corsMiddleware',
        'logAccessMiddleware',
        'directoryListingMiddleware',
        'listDirectoryItemsHandler'
      ]);
      expect(response.body.params).toEqual({});
    });
  });

  describe('handles control routes correctly', (): void => {
    test('stop', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/control/stop');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'controlMiddleware', 'stopHandler']);
    });

    test('reload', async (): Promise<void> => {
      const app = buildApp();

      await request(app).post('/control/reload');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'controlMiddleware', 'reloadHandler']);
    });
  });

  describe('staticMiddleware', (): void => {
    test('will be called, if request not handled already', async (): Promise<void> => {
      const app = buildApp();

      await request(app).get('/image.png');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'staticMiddleware', 'notFoundMiddleware']);
    });

    test('wont be called if request handled already', async (): Promise<void> => {
      const app = buildApp();

      await request(app).get('/test');

      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'staticMiddleware', 'notFoundMiddleware']);
    });
  });

  describe('handles 404 correctly', (): void => {
    test('with fallback 404', async (): Promise<void> => {
      const app = buildApp();

      const response = await request(app).get('/nope');

      expect(response.statusCode).toBe(404);
      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'staticMiddleware', 'notFoundMiddleware']);
    });
  });

  describe('handles unexpected error correctly', (): void => {
    test('on synchronous handler', async (): Promise<void> => {
      const error = new Error('test error');
      const app = buildApp();

      const response = await request(app).post('/api/login').send({ error });

      expect(response.statusCode).toBe(500);
      expect(mocked_lastChain).toEqual(['headerMiddleware', 'corsMiddleware', 'logAccessMiddleware', 'loginHandler', 'errorMiddleware']);
    });

    test('on asynchronous handler', async (): Promise<void> => {
      const error = new Error('test error');
      const app = buildApp();

      const response = await request(app).post('/api/register').send({ error });

      expect(response.statusCode).toBe(500);
      expect(mocked_lastChain).toEqual([
        'headerMiddleware',
        'corsMiddleware',
        'logAccessMiddleware',
        'registerMiddleware',
        'registerHandler',
        'errorMiddleware'
      ]);
    });
  });
});
