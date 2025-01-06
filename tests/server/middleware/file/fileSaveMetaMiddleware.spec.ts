import mockFS from 'mock-fs';
import { loadConfig } from '@/config';
import { assertUnauthorized, assertPass, buildRequestForFileAction, buildResponse, resetLastMessage } from '#/server/expressTestUtils';
import { fileSaveMiddleware } from '@/server/middleware/file/file';
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

describe('fileSaveMetaMiddleware', () => {
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
        loadConfig({ defaultPermissions: { [level]: { update: true } } });
        mockFS({
          '/opt/files-crud': {
            files: { [directory]: { file: '' } },
            data: { [`${directory}~file`]: JSON.stringify({ owner: owner ?? '', meta: {}, contentType: '' }) }
          }
        });
        let next = false;
        const req = buildRequestForFileAction(token, 'save-meta', `${directory}/file`, {});
        const res = buildResponse();

        await fileSaveMiddleware(req, res, () => (next = true));

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
        await passesIfUpdatePermissionIsGiven('owner', 'valid-user-token', testUser.ownerId, 'dir');
      });

      test('for owner, directory.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await passesIfUpdatePermissionIsGiven('owner', 'valid-user-token', '', `user_${testUser.ownerId}`);
      });
    });
  });

  describe('rejects', (): void => {
    describe('if update permission is not given', (): void => {
      const rejectsIfUpdatePermissionIsNotGiven = async function (level: string, token: string, owner: string, directory: string) {
        loadConfig({ defaultPermissions: { [level]: {} } });
        let next = false;
        const req = buildRequestForFileAction(token, 'save-meta', `${directory}/file`, {});
        const res = buildResponse();
        mockFS({
          '/opt/files-crud': {
            files: { [directory]: { file: '' } },
            data: { [`${directory}~file`]: JSON.stringify({ owner: owner ?? '', meta: {}, contentType: '' }) }
          }
        });

        await fileSaveMiddleware(req, res, () => (next = true));

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

      test('for admin.', async (): Promise<void> => {
        mocked_token = 'valid-admin-token';
        mocked_user = { ...testUser, admin: true };
        await rejectsIfUpdatePermissionIsNotGiven('admin', 'valid-admin-token', 'owner', 'dir');
      });

      test('for owner, file.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await rejectsIfUpdatePermissionIsNotGiven('owner', 'valid-user-token', testUser.ownerId, 'dir');
      });

      test('for owner, directory.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await rejectsIfUpdatePermissionIsNotGiven('owner', 'valid-user-token', '', `user_${testUser.ownerId}`);
      });
    });
  });
});
