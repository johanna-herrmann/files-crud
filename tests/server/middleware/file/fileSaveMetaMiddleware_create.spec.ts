import mockFS from 'mock-fs';
import { loadConfig } from '@/config/config';
import { assertUnauthorized, assertPass, buildRequestForFileAction, buildResponse, resetLastMessage } from '#/server/expressTestUtils';
import { fileSaveMetaMiddleware } from '@/server/middleware/file/file';
import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import User from '@/types/user/User';
import { testUser } from '#/testItems';
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

describe('fileSaveMetaMiddleware - create', () => {
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
    describe('if create permission is given', (): void => {
      const passesIfCreatePermissionIsGiven = async function (level: string, token: string, directory: string) {
        const levels: Record<string, string> = {
          owner: '800',
          user: '080',
          public: '008'
        };
        loadConfig({ defaultPermissions: levels[level], storage: { name: 'fs', path: '/opt/files-crud' } });
        mockFS({
          '/opt/files-crud': {
            files: { ke: { key: '' } },
            data: { [directory]: { file: JSON.stringify({ owner: '', contentType: '', key: 'ke/key' }) } }
          }
        });
        let next = false;
        const req = buildRequestForFileAction(token, 'save-meta', `${directory}/file`, {});
        const res = buildResponse();

        await fileSaveMetaMiddleware(req, res, () => (next = true));

        assertPass(next, res);
      };

      test('for public.', async (): Promise<void> => {
        await passesIfCreatePermissionIsGiven('public', 'token', 'dir');
      });

      test('for user.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await passesIfCreatePermissionIsGiven('user', 'valid-user-token', 'dir');
      });

      test('for admin.', async (): Promise<void> => {
        mocked_token = 'valid-admin-token';
        mocked_user = { ...testUser, admin: true };
        await passesIfCreatePermissionIsGiven('admin', 'valid-admin-token', 'dir');
      });

      test('for owner, file.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await passesIfCreatePermissionIsGiven('owner', 'valid-user-token', `user_${testUser.id}`);
      });
    });
  });

  describe('rejects', (): void => {
    describe('if create permission is not given', (): void => {
      const rejectsIfCreatePermissionIsNotGiven = async function (level: string, token: string, directory: string) {
        const levels: Record<string, string> = {
          owner: '7ff',
          user: 'f7f',
          public: 'ff7'
        };
        loadConfig({ defaultPermissions: levels[level], storage: { name: 'fs', path: '/opt/files-crud' } });
        let next = false;
        const req = buildRequestForFileAction(token, 'save-meta', `${directory}/file`, {});
        const res = buildResponse();
        mockFS({
          '/opt/files-crud': {
            files: { ke: { key: '' } },
            data: { [directory]: { file: JSON.stringify({ owner: '', contentType: '', key: 'ke/key' }) } }
          }
        });

        await fileSaveMetaMiddleware(req, res, () => (next = true));

        assertUnauthorized(next, res, `You are not allowed to create ${directory}/file`);
      };

      test('for public.', async (): Promise<void> => {
        await rejectsIfCreatePermissionIsNotGiven('public', 'token', 'dir');
      });

      test('for user.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await rejectsIfCreatePermissionIsNotGiven('user', 'valid-user-token', 'dir');
      });

      test('for owner, file.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await rejectsIfCreatePermissionIsNotGiven('owner', 'valid-user-token', `user_${testUser.id}`);
      });
    });
  });
});
