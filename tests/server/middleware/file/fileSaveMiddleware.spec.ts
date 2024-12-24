import mockFS from 'mock-fs';
import { loadConfig } from '@/config';
import { assertError, assertPass, buildRequestForFileAction, buildResponse, resetLastMessage } from '#/server/expressTestUtils';
import { fileSaveMiddleware } from '@/server/middleware/file/file';
import User from '@/types/User';
import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import { testUser } from '#/testItems';

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

describe('fileSaveMiddleware', () => {
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
        const req = buildRequestForFileAction(token, 'save', `${directory}/file`, {});
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

    describe('if create permission is given', (): void => {
      const passesIfCreatePermissionIsGiven = async function (level: string, token: string, directory: string) {
        loadConfig({ defaultPermissions: { [level]: { create: true } } });
        mockFS({
          '/opt/files-crud': {
            files: { [directory]: {} },
            data: {}
          }
        });
        let next = false;
        const req = buildRequestForFileAction(token, 'save', `${directory}/file`, {});
        const res = buildResponse();

        await fileSaveMiddleware(req, res, () => (next = true));

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

      test('for owner.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await passesIfCreatePermissionIsGiven('owner', 'valid-user-token', `user_${testUser.ownerId}`);
      });
    });
  });

  describe('rejects', (): void => {
    describe('if update permission is not given', (): void => {
      const rejectsIfUpdatePermissionIsNotGiven = async function (level: string, token: string, owner: string, directory: string) {
        loadConfig({ defaultPermissions: { [level]: {} } });
        let next = false;
        const req = buildRequestForFileAction(token, 'save', `${directory}/file`, {});
        const res = buildResponse();
        mockFS({
          '/opt/files-crud': {
            files: { [directory]: { file: '' } },
            data: { [`${directory}~file`]: JSON.stringify({ owner: owner ?? '', meta: {}, contentType: '' }) }
          }
        });

        await fileSaveMiddleware(req, res, () => (next = true));

        assertError(next, res, `You are not allowed to update ${directory}/file`);
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

    describe('if create permission is not given', (): void => {
      const rejectsIfCreatePermissionIsNotGiven = async function (level: string, token: string, directory: string) {
        let next = false;
        const req = buildRequestForFileAction(token, 'save', `${directory}/file`, {});
        const res = buildResponse();
        loadConfig({ defaultPermissions: { [level]: {} } });
        mockFS({
          '/opt/files-crud': {
            files: { [directory]: {} },
            data: {}
          }
        });

        await fileSaveMiddleware(req, res, () => (next = true));

        assertError(next, res, `You are not allowed to create ${directory}/file`);
      };

      test('for public.', async (): Promise<void> => {
        await rejectsIfCreatePermissionIsNotGiven('public', 'token', 'dir');
      });

      test('for user.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await rejectsIfCreatePermissionIsNotGiven('user', 'valid-user-token', 'dir');
      });

      test('for admin.', async (): Promise<void> => {
        mocked_token = 'valid-admin-token';
        mocked_user = { ...testUser, admin: true };
        await rejectsIfCreatePermissionIsNotGiven('admin', 'valid-admin-token', 'dir');
      });

      test('for owner.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await rejectsIfCreatePermissionIsNotGiven('owner', 'valid-user-token', `user_${testUser.ownerId}`);
      });
    });
  });
});
