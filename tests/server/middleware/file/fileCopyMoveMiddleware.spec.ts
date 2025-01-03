import express from 'express';
import Request from '@/types/server/Request';
import { assertUnauthorized, assertPass, buildRequestForFileAction, buildResponse, resetLastMessage } from '#/server/expressTestUtils';
import { fileCopyMoveMiddleware } from '@/server/middleware/file/copyMove';
import { sendUnauthorized } from '@/server/util';

let mocked_passRead = false;
let mocked_passWrite = false;
let mocked_passDelete = false;

let mocked_readPath = '';
let mocked_writePath = '';
let mocked_deletePath = '';

jest.mock('@/server/middleware/file/file', () => {
  return {
    async loadMiddleware(req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
      const path = (req.params as Record<string, string>).path ?? '-';
      mocked_readPath = path;
      if (mocked_passRead) {
        next();
      } else {
        sendUnauthorized(res, `You are not allowed to read ${path}`);
      }
    },
    async fileSaveMiddleware(req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
      const path = (req.params as Record<string, string>).path ?? '-';
      mocked_writePath = path;
      if (mocked_passWrite) {
        next();
      } else {
        sendUnauthorized(res, `You are not allowed to write ${path}`);
      }
    },
    async fileDeleteMiddleware(req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
      const path = (req.params as Record<string, string>).path ?? '-';
      mocked_deletePath = path;
      if (mocked_passDelete) {
        next();
      } else {
        sendUnauthorized(res, `You are not allowed to delete ${path}`);
      }
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
  });

  afterEach(async (): Promise<void> => {
    resetLastMessage();
  });

  const arrange = function (action: string, passRead: boolean, passWrite: boolean, passDelete: boolean): [req: Request, res: express.Response] {
    mocked_passRead = passRead;
    mocked_passWrite = passWrite;
    mocked_passDelete = passDelete;
    const req = buildRequestForFileAction('', action, undefined, { path: 'src/file', targetPath: 'target/copy' });
    const res = buildResponse();
    return [req, res];
  };

  describe('copy', (): void => {
    test('passes.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange('copy', true, true, false);

      await fileCopyMoveMiddleware(req, res, () => (next = true));

      expect(mocked_readPath).toBe('src/file');
      expect(mocked_writePath).toBe('target/copy');
      assertPass(next, res);
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
  });

  describe('move', (): void => {
    test('passes.', async (): Promise<void> => {
      let next = false;
      const [req, res] = arrange('move', true, true, true);

      await fileCopyMoveMiddleware(req, res, () => (next = true));

      expect(mocked_readPath).toBe('src/file');
      expect(mocked_writePath).toBe('target/copy');
      expect(mocked_deletePath).toBe('src/file');
      assertPass(next, res);
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
  });
});
