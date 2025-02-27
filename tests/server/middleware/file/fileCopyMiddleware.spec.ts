import express from 'express';
import { fileCopyMiddleware } from '@/server/middleware/file/copyMove';
import { assertUnauthorized, assertPass, buildRequestForFileAction, buildResponse, resetLastMessage } from '#/server/expressTestUtils';
import { sendUnauthorized } from '@/server/util';
import { testUser } from '#/testItems';
import { Logger } from '@/logging/Logger';
import User from '@/types/user/User';
import Request from '@/types/server/Request';

let mocked_passRead = false;
let mocked_passWrite = false;

let mocked_readPath = '';
let mocked_writePath = '';

jest.mock('@/server/middleware/file/file', () => {
  const actual = jest.requireActual('@/server/middleware/file/file');
  return {
    ...actual,
    async loadMiddleware(req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
      const path = (req.params as Record<string, string[]>).path.join('/');
      mocked_readPath = path;
      if (mocked_passRead) {
        next();
      } else {
        sendUnauthorized(res, `You are not allowed to read ${path}`);
      }
    },
    async fileSaveMiddleware(req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
      const path = (req.params as Record<string, string[]>).path.join('/');
      mocked_writePath = path;
      if (mocked_passWrite) {
        next();
      } else {
        sendUnauthorized(res, `You are not allowed to write ${path}`);
      }
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
    getLogger(): Logger {
      return logger;
    },
    loadLogger(): Logger {
      return logger;
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

describe('fileCopyMiddleware', (): void => {
  beforeEach(async (): Promise<void> => {
    mocked_passRead = false;
    mocked_passWrite = false;
    mocked_readPath = '';
    mocked_writePath = '';
    mocked_user = null;
  });

  afterEach(async (): Promise<void> => {
    resetLastMessage();
  });

  const arrange = function (passRead: boolean, passWrite: boolean, copyOwner?: boolean): [req: Request, res: express.Response] {
    mocked_passRead = passRead;
    mocked_passWrite = passWrite;
    const req = buildRequestForFileAction('', 'move', undefined, { path: 'src/file', targetPath: 'target/copy', copyOwner: copyOwner ?? false });
    const res = buildResponse();
    return [req, res];
  };

  describe('copy', (): void => {
    test('passes, change owner.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange(true, true, false);

      await fileCopyMiddleware(req, res, () => (next = true));

      expect(mocked_readPath).toBe('src/file');
      expect(mocked_writePath).toBe('target/copy');
      assertPass(next, res);
      expect(req.body.userId).toBe('public');
    });

    test('passes, copy owner.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange(true, true, true);
      mocked_user = { ...testUser, admin: true };

      await fileCopyMiddleware(req, res, () => (next = true));

      expect(mocked_readPath).toBe('src/file');
      expect(mocked_writePath).toBe('target/copy');
      assertPass(next, res);
      expect(req.body.userId).toBe(testUser.id);
    });

    test('rejects write target.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange(true, false, false);

      await fileCopyMiddleware(req, res, () => (next = true));

      expect(mocked_readPath).toBe('src/file');
      expect(mocked_writePath).toBe('target/copy');
      assertUnauthorized(next, res, 'You are not allowed to write target/copy');
    });

    test('rejects read source.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange(false, false, false);

      await fileCopyMiddleware(req, res, () => (next = true));

      expect(mocked_readPath).toBe('src/file');
      expect(mocked_writePath).toBe('');
      assertUnauthorized(next, res, 'You are not allowed to read src/file');
    });

    test('rejects keep owner for normal user.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange(true, true, true);
      mocked_user = { ...testUser, admin: false };

      await fileCopyMiddleware(req, res, () => (next = true));

      assertUnauthorized(next, res, 'Only admins are allowed to copy the owner');
    });

    test('rejects keep owner for public.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange(true, true, true);

      await fileCopyMiddleware(req, res, () => (next = true));

      assertUnauthorized(next, res, 'Only admins are allowed to copy the owner');
    });
  });
});
