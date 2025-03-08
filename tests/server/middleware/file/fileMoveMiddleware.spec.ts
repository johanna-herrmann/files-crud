import express from 'express';
import {
  assertUnauthorized,
  assertPass,
  buildRequestForFileAction,
  buildResponse,
  resetLastMessage,
  assertError
} from '#/server/expressTestUtils';
import { fileCopyMiddleware, fileMoveMiddleware } from '@/server/middleware/file/copyMove';
import { sendUnauthorized } from '@/server/util';
import { Logger } from '@/logging/Logger';
import { User } from '@/types/user/User';
import { Request } from '@/types/server/Request';

let mocked_passWrite = false;
let mocked_passDelete = false;

let mocked_writePath = '';
let mocked_deletePath = '';

jest.mock('@/server/middleware/file/file', () => {
  return {
    async fileSaveMiddleware(req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
      const path = (req.params as Record<string, string[]>).path.join('/');
      mocked_writePath = path;
      if (mocked_passWrite) {
        next();
      } else {
        sendUnauthorized(res, `You are not allowed to write ${path}`);
      }
    },
    async fileDeleteMiddleware(req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
      const path = (req.params as Record<string, string[]>).path.join('/');
      mocked_deletePath = path;
      if (mocked_passDelete) {
        next();
      } else {
        sendUnauthorized(res, `You are not allowed to delete ${path}`);
      }
    }
  };
});

jest.mock('@/logging/index', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    resetLogger() {},
    loadLogger(): Logger {
      return {
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
    }
  };
});

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

describe('fileCopyMoveMiddleware', (): void => {
  beforeEach(async (): Promise<void> => {
    mocked_passWrite = false;
    mocked_passDelete = false;
    mocked_writePath = '';
    mocked_deletePath = '';
    mocked_user = null;
  });

  afterEach(async (): Promise<void> => {
    resetLastMessage();
  });

  const arrange = function (passWrite: boolean, passDelete: boolean): [req: Request, res: express.Response] {
    mocked_passWrite = passWrite;
    mocked_passDelete = passDelete;
    const req = buildRequestForFileAction('', 'move', undefined, { path: 'src/file', targetPath: 'target/copy' });
    const res = buildResponse();
    return [req, res];
  };

  describe('move', (): void => {
    test('passes.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange(true, true);

      await fileMoveMiddleware(req, res, () => (next = true));

      expect(mocked_deletePath).toBe('src/file');
      expect(mocked_writePath).toBe('target/copy');
      assertPass(next, res);
    });

    test('rejects write target.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange(false, true);

      await fileMoveMiddleware(req, res, () => (next = true));

      expect(mocked_deletePath).toBe('src/file');
      expect(mocked_writePath).toBe('target/copy');
      assertUnauthorized(next, res, 'You are not allowed to write target/copy');
    });

    test('rejects delete source.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange(true, false);

      await fileMoveMiddleware(req, res, () => (next = true));

      expect(mocked_deletePath).toBe('src/file');
      expect(mocked_writePath).toBe('');
      assertUnauthorized(next, res, 'You are not allowed to delete src/file');
    });

    test('sends error on invalid body.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange(true, true);
      req.body = { path: 'file', targetPath: '' };

      await fileCopyMiddleware(req, res, () => (next = true));

      expect(mocked_deletePath).toBe('');
      expect(mocked_writePath).toBe('');
      expect(next).toBe(false);
      assertError(res, 'ValidationError: "targetPath" is not allowed to be empty');
    });
  });
});
