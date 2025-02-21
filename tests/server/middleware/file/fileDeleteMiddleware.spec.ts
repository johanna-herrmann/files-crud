import mockFS from 'mock-fs';
import { loadConfig } from '@/config/config';
import { assertUnauthorized, assertPass, buildRequestForFileAction, buildResponse, resetLastMessage } from '#/server/expressTestUtils';
import { fileDeleteMiddleware } from '@/server/middleware/file/file';
import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import { testUser } from '#/testItems';
import User from '@/types/user/User';
import { Logger } from '@/logging/Logger';

let mocked_token: string | null;
let mocked_user: User | null = null;
jest.mock('@/user/auth', () => {
  const actual = jest.requireActual('@/user/auth');
  // noinspection JSUnusedGlobalSymbols
  return {
    ...actual,
    async authorize(token: string | null): Promise<User | null> {
      if (token === mocked_token) {
        return mocked_user;
      }
      return await actual.authorize(token);
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

describe('fileDeleteMiddleware', () => {
  beforeEach(async (): Promise<void> => {
    loadConfig();
  });

  afterEach(async (): Promise<void> => {
    mockFS.restore();
    data.user_ = [];
    mocked_token = null;
    mocked_user = null;
    resetLastMessage();
  });

  describe('passes', (): void => {
    describe('if delete permission is given', (): void => {
      const passesIfDeletePermissionIsGiven = async function (level: string, token: string, owner: string, directory: string) {
        const levels: Record<string, string> = {
          owner: '100',
          user: '010',
          public: '001'
        };
        loadConfig({ defaultPermissions: levels[level] });
        mockFS({
          './files': { [directory]: { file: '' } },
          './data': { [`${directory}~file`]: JSON.stringify({ owner: owner ?? '', meta: {}, contentType: '' }) }
        });
        let next = false;
        const req = buildRequestForFileAction(token, 'remove', `${directory}/file`, {});
        const res = buildResponse();

        await fileDeleteMiddleware(req, res, () => (next = true));

        assertPass(next, res);
      };

      test('for public.', async (): Promise<void> => {
        await passesIfDeletePermissionIsGiven('public', 'token', '', 'dir');
      });

      test('for user.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await passesIfDeletePermissionIsGiven('user', 'valid-user-token', '', 'dir');
      });

      test('for admin.', async (): Promise<void> => {
        mocked_token = 'valid-admin-token';
        mocked_user = { ...testUser, admin: true };
        await passesIfDeletePermissionIsGiven('admin', 'valid-admin-token', '', 'dir');
      });

      test('for owner, file.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await passesIfDeletePermissionIsGiven('owner', 'valid-user-token', testUser.id, 'dir');
      });
    });
  });

  describe('rejects', (): void => {
    describe('if delete permission is not given', (): void => {
      const rejectsIfDeletePermissionIsNotGiven = async function (level: string, token: string, owner: string, directory: string) {
        const levels: Record<string, string> = {
          owner: 'eff',
          user: 'fef',
          public: 'ffe'
        };
        loadConfig({ defaultPermissions: levels[level] });
        let next = false;
        const req = buildRequestForFileAction(token, 'remove', `${directory}/file`, {});
        const res = buildResponse();
        mockFS({
          './files': { [directory]: { file: '' } },
          './data': { [`${directory}~file`]: JSON.stringify({ owner: owner ?? '', meta: {}, contentType: '' }) }
        });

        await fileDeleteMiddleware(req, res, () => (next = true));

        assertUnauthorized(next, res, `You are not allowed to delete ${directory}/file`);
      };

      test('for public.', async (): Promise<void> => {
        await rejectsIfDeletePermissionIsNotGiven('public', 'token', 'owner', 'dir');
      });

      test('for user.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await rejectsIfDeletePermissionIsNotGiven('user', 'valid-user-token', 'owner', 'dir');
      });

      test('for owner, file.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await rejectsIfDeletePermissionIsNotGiven('owner', 'valid-user-token', testUser.id, 'dir');
      });
    });
  });
});
