import mockFS from 'mock-fs';
import { loadConfig } from '@/config';
import { assertError, assertPass, buildRequestForFileAction, buildResponse, resetLastMessage } from '#/server/expressTestUtils';
import { fileDeleteMiddleware } from '@/server/middleware/file/file';
import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import { testUser } from '#/testItems';
import User from '@/types/User';

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
        loadConfig({ defaultPermissions: { [level]: { delete: true } } });
        mockFS({
          '/opt/files-crud': {
            files: { [directory]: { file: '' } },
            data: { [`${directory}~file`]: JSON.stringify({ owner: owner ?? '', meta: {}, contentType: '' }) }
          }
        });
        let next = false;
        const req = buildRequestForFileAction(token, 'delete', `${directory}/file`, {});
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
        await passesIfDeletePermissionIsGiven('owner', 'valid-user-token', testUser.ownerId, 'dir');
      });

      test('for owner, directory.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await passesIfDeletePermissionIsGiven('owner', 'valid-user-token', '', `user_${testUser.ownerId}`);
      });
    });
  });

  describe('rejects', (): void => {
    describe('if delete permission is not given', (): void => {
      const rejectsIfDeletePermissionIsNotGiven = async function (level: string, token: string, owner: string, directory: string) {
        loadConfig({ defaultPermissions: { [level]: {} } });
        let next = false;
        const req = buildRequestForFileAction(token, 'delete', `${directory}/file`, {});
        const res = buildResponse();
        mockFS({
          '/opt/files-crud': {
            files: { [directory]: { file: '' } },
            data: { [`${directory}~file`]: JSON.stringify({ owner: owner ?? '', meta: {}, contentType: '' }) }
          }
        });

        await fileDeleteMiddleware(req, res, () => (next = true));

        assertError(next, res, `You are not allowed to delete ${directory}/file`);
      };

      test('for public.', async (): Promise<void> => {
        await rejectsIfDeletePermissionIsNotGiven('public', 'token', 'owner', 'dir');
      });

      test('for user.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await rejectsIfDeletePermissionIsNotGiven('user', 'valid-user-token', 'owner', 'dir');
      });

      test('for admin.', async (): Promise<void> => {
        mocked_token = 'valid-admin-token';
        mocked_user = { ...testUser, admin: true };
        await rejectsIfDeletePermissionIsNotGiven('admin', 'valid-admin-token', 'owner', 'dir');
      });

      test('for owner, file.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await rejectsIfDeletePermissionIsNotGiven('owner', 'valid-user-token', testUser.ownerId, 'dir');
      });

      test('for owner, directory.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await rejectsIfDeletePermissionIsNotGiven('owner', 'valid-user-token', '', `user_${testUser.ownerId}`);
      });
    });
  });
});
