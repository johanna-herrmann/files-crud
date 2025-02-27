import mockFS from 'mock-fs';
import { loadConfig } from '@/config/config';
import { assertUnauthorized, assertPass, buildRequestForFileAction, buildResponse, resetLastMessage } from '#/server/expressTestUtils';
import { existsMiddleware } from '@/server/middleware/file/file';
import { Logger } from '@/logging/Logger';
import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import { testUser } from '#/testItems';
import User from '@/types/user/User';

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

describe('existsMiddleware', () => {
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
    describe('if read permission is given', (): void => {
      const passesIfReadPermissionIsGiven = async function (level: string, token: string, directory: string) {
        const levels: Record<string, string> = {
          owner: '400',
          user: '040',
          public: '004'
        };
        loadConfig({ defaultPermissions: levels[level] });
        mockFS({
          '/opt/files-crud': {
            files: { [directory]: { file: '' } },
            data: { [`${directory}~file`]: JSON.stringify({ owner: '', meta: {}, contentType: '' }) }
          }
        });
        let next = false;
        const req = buildRequestForFileAction(token, 'list', `${directory}/file`, {});
        const res = buildResponse();

        await existsMiddleware(req, res, () => (next = true));

        assertPass(next, res);
      };

      test('for public.', async (): Promise<void> => {
        await passesIfReadPermissionIsGiven('public', 'token', 'dir');
      });

      test('for user.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await passesIfReadPermissionIsGiven('user', 'valid-user-token', 'dir');
      });

      test('for admin.', async (): Promise<void> => {
        mocked_token = 'valid-admin-token';
        mocked_user = { ...testUser, admin: true };
        await passesIfReadPermissionIsGiven('admin', 'valid-admin-token', 'dir');
      });

      test('for owner, directory.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await passesIfReadPermissionIsGiven('owner', 'valid-user-token', `user_${testUser.id}`);
      });
    });
  });

  describe('rejects', (): void => {
    describe('if read permission is not given', (): void => {
      const rejectsIfReadPermissionIsNotGiven = async function (level: string, token: string, directory: string) {
        const levels: Record<string, string> = {
          owner: 'bff',
          user: 'fbf',
          public: 'ffb'
        };
        loadConfig({ defaultPermissions: levels[level] });
        let next = false;
        const req = buildRequestForFileAction(token, 'list', `${directory}/file`, {});
        const res = buildResponse();
        mockFS({
          '/opt/files-crud': {
            files: { [directory]: { file: '' } },
            data: { [`${directory}~file`]: JSON.stringify({ owner: '', meta: {}, contentType: '' }) }
          }
        });

        await existsMiddleware(req, res, () => (next = true));

        assertUnauthorized(next, res, `You are not allowed to read ${directory}/file`);
      };

      test('for public.', async (): Promise<void> => {
        await rejectsIfReadPermissionIsNotGiven('public', 'token', 'dir');
      });

      test('for user.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await rejectsIfReadPermissionIsNotGiven('user', 'valid-user-token', 'dir');
      });

      test('for owner, directory.', async (): Promise<void> => {
        mocked_token = 'valid-user-token';
        mocked_user = testUser;
        await rejectsIfReadPermissionIsNotGiven('owner', 'valid-user-token', `user_${testUser.id}`);
      });
    });
  });
});
