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

describe('fileSaveMetaMiddleware - update', () => {
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
    describe('if update permission is given', (): void => {
      const passesIfUpdatePermissionIsGiven = async function (level: string, token: string, owner: string, directory: string) {
        const levels: Record<string, string> = {
          owner: '200',
          user: '020',
          public: '002'
        };
        loadConfig({ defaultPermissions: levels[level], storage: { name: 'fs', path: '/opt/files-crud' } });
        mockFS({
          '/opt/files-crud': {
            files: { ke: { key: '' } },
            data: { [directory]: { file: JSON.stringify({ owner: owner ?? '', meta: {}, contentType: '', key: 'ke/key' }) } }
          }
        });
        let next = false;
        const req = buildRequestForFileAction(token, 'save-meta', `${directory}/file`, {});
        const res = buildResponse();

        await fileSaveMetaMiddleware(req, res, () => (next = true));

        assertPass(next, res);
      };

      test('for public.', async (): Promise<void> => {
        await passesIfUpdatePermissionIsGiven('public', 'token', 'owner', 'dir');
      });

      test('for user.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await passesIfUpdatePermissionIsGiven('user', 'valid-user-token', 'owner', 'dir');
      });

      test('for admin.', async (): Promise<void> => {
        mocked_token = 'valid-admin-token';
        mocked_user = { ...testUser, admin: true };
        await passesIfUpdatePermissionIsGiven('admin', 'valid-admin-token', 'owner', 'dir');
      });

      test('for owner, file.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await passesIfUpdatePermissionIsGiven('owner', 'valid-user-token', testUser.id, 'dir');
      });
    });
  });

  describe('rejects', (): void => {
    describe('if update permission is not given', (): void => {
      const rejectsIfUpdatePermissionIsNotGiven = async function (level: string, token: string, owner: string, directory: string) {
        const levels: Record<string, string> = {
          owner: 'dff',
          user: 'fdf',
          public: 'ffd'
        };
        loadConfig({ defaultPermissions: levels[level], storage: { name: 'fs', path: '/opt/files-crud' } });
        let next = false;
        const req = buildRequestForFileAction(token, 'save-meta', `${directory}/file`, {});
        const res = buildResponse();
        mockFS({
          '/opt/files-crud': {
            files: { ke: { key: '' } },
            data: { [directory]: { file: JSON.stringify({ owner: owner ?? '', meta: {}, contentType: '', key: 'ke/key' }) } }
          }
        });

        await fileSaveMetaMiddleware(req, res, () => (next = true));

        assertUnauthorized(next, res, `You are not allowed to update ${directory}/file`);
      };

      test('for public.', async (): Promise<void> => {
        await rejectsIfUpdatePermissionIsNotGiven('public', 'token', 'owner', 'dir');
      });

      test('for user.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await rejectsIfUpdatePermissionIsNotGiven('user', 'valid-user-token', 'owner', 'dir');
      });

      test('for owner, file.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await rejectsIfUpdatePermissionIsNotGiven('owner', 'valid-user-token', testUser.id, 'dir');
      });
    });
  });
});
