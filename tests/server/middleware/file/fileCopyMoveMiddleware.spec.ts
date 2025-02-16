import express from 'express';
import Request from '@/types/server/Request';
import { assertUnauthorized, assertPass, buildRequestForFileAction, buildResponse, resetLastMessage } from '#/server/expressTestUtils';
import { fileCopyMoveMiddleware } from '@/server/middleware/file/copyMove';
import { sendUnauthorized } from '@/server/util';
import User from '@/types/user/User';
import { testUser } from '#/testItems';
import { Logger } from '@/logging/Logger';

let mocked_passRead = false;
let mocked_passWrite = false;
let mocked_passDelete = false;

let mocked_readPath = '';
let mocked_writePath = '';
let mocked_deletePath = '';

jest.mock('@/server/middleware/file/file', () => {
  return {
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
    mocked_passRead = false;
    mocked_passWrite = false;
    mocked_passDelete = false;
    mocked_readPath = '';
    mocked_writePath = '';
    mocked_deletePath = '';
    mocked_user = null;
  });

  afterEach(async (): Promise<void> => {
    resetLastMessage();
  });

  const arrange = function (
    action: string,
    passRead: boolean,
    passWrite: boolean,
    passDelete: boolean,
    copyOwner?: boolean
  ): [req: Request, res: express.Response] {
    mocked_passRead = passRead;
    mocked_passWrite = passWrite;
    mocked_passDelete = passDelete;
    const req = buildRequestForFileAction('', action, undefined, { path: 'src/file', targetPath: 'target/copy', copyOwner: copyOwner ?? false });
    const res = buildResponse();
    return [req, res];
  };

  describe('copy', (): void => {
    test('passes, change owner.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange('copy', true, true, false);

      await fileCopyMoveMiddleware(req, res, () => (next = true));

      expect(mocked_readPath).toBe('src/file');
      expect(mocked_writePath).toBe('target/copy');
      assertPass(next, res);
      expect(req.body.user).toBeUndefined();
    });

    test('passes, keep owner.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange('copy', true, true, false, true);
      mocked_user = { ...testUser, admin: true };

      await fileCopyMoveMiddleware(req, res, () => (next = true));

      expect(mocked_readPath).toBe('src/file');
      expect(mocked_writePath).toBe('target/copy');
      assertPass(next, res);
      expect(req.body.user).toEqual({ ...testUser, admin: true });
    });

    test('rejects write target.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange('copy', true, false, false);

      await fileCopyMoveMiddleware(req, res, () => (next = true));

      expect(mocked_readPath).toBe('src/file');
      expect(mocked_writePath).toBe('target/copy');
      assertUnauthorized(next, res, 'You are not allowed to write target/copy');
    });

    test('rejects read source.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange('copy', false, false, false);

      await fileCopyMoveMiddleware(req, res, () => (next = true));

      expect(mocked_readPath).toBe('src/file');
      expect(mocked_writePath).toBe('');
      assertUnauthorized(next, res, 'You are not allowed to read src/file');
    });

    test('rejects keep owner for normal user.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange('copy', true, false, false, true);
      mocked_user = { ...testUser };

      await fileCopyMoveMiddleware(req, res, () => (next = true));

      assertUnauthorized(next, res, 'Only admins are allowed to copy the owner');
    });

    test('rejects keep owner for public.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange('copy', true, false, false, true);

      await fileCopyMoveMiddleware(req, res, () => (next = true));

      assertUnauthorized(next, res, 'Only admins are allowed to copy the owner');
    });
  });

  describe('move', (): void => {
    test('passes, change owner.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange('move', true, true, true);

      await fileCopyMoveMiddleware(req, res, () => (next = true));

      expect(mocked_readPath).toBe('src/file');
      expect(mocked_writePath).toBe('target/copy');
      expect(mocked_deletePath).toBe('src/file');
      assertPass(next, res);
      expect(req.body.user).toBeUndefined();
    });

    test('passes, keep owner.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange('move', true, true, true, true);
      mocked_user = { ...testUser, admin: true };

      await fileCopyMoveMiddleware(req, res, () => (next = true));

      expect(mocked_readPath).toBe('src/file');
      expect(mocked_writePath).toBe('target/copy');
      expect(mocked_deletePath).toBe('src/file');
      assertPass(next, res);
      expect(req.body.user).toEqual({ ...testUser, admin: true });
    });

    test('rejects delete source.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange('move', true, true, false);

      await fileCopyMoveMiddleware(req, res, () => (next = true));

      expect(mocked_readPath).toBe('src/file');
      expect(mocked_writePath).toBe('target/copy');
      expect(mocked_deletePath).toBe('src/file');
      assertUnauthorized(next, res, 'You are not allowed to delete src/file');
    });

    test('rejects write target.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange('move', true, false, false);

      await fileCopyMoveMiddleware(req, res, () => (next = true));

      expect(mocked_readPath).toBe('src/file');
      expect(mocked_writePath).toBe('target/copy');
      expect(mocked_deletePath).toBe('');
      assertUnauthorized(next, res, 'You are not allowed to write target/copy');
    });

    test('rejects read source.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange('move', false, false, false);

      await fileCopyMoveMiddleware(req, res, () => (next = true));

      expect(mocked_readPath).toBe('src/file');
      expect(mocked_writePath).toBe('');
      expect(mocked_deletePath).toBe('');
      assertUnauthorized(next, res, 'You are not allowed to read src/file');
    });

    test('rejects keep owner for normal user.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange('move', true, false, false, true);
      mocked_user = { ...testUser };

      await fileCopyMoveMiddleware(req, res, () => (next = true));

      assertUnauthorized(next, res, 'Only admins are allowed to copy the owner');
    });

    test('rejects keep owner for public.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange('move', true, false, false, true);

      await fileCopyMoveMiddleware(req, res, () => (next = true));

      assertUnauthorized(next, res, 'Only admins are allowed to copy the owner');
    });
  });
});
