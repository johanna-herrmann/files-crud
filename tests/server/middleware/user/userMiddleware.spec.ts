import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import { testUser } from '#/testItems';
import {
  assertUnauthorized,
  assertPass,
  buildRequestForUserAction,
  buildResponse,
  resetLastMessage,
  assertValidationError
} from '#/server/expressTestUtils';
import { userMiddleware } from '@/server/middleware';
import { invalidCredentials } from '@/user';
import { Logger } from '@/logging/Logger';
import { User } from '@/types/user/User';

const idConstraint = 'required string, uuid or "self"';
const usernameConstraint = 'required string, 3 to 64 chars long';
const passwordConstraint = 'optional string, at least 8 chars long';
const requiredPasswordConstraint = 'required string, at least 8 chars long';
const metaConstraint = 'optional object';
const adminConstraint = 'optional boolean';
const requiredAdminConstraint = 'required boolean';

const otherId = '92512b3f-0b34-413b-813d-f1c81913da63';

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
    },
    async checkPassword(username: string, password: string): Promise<string> {
      if (username === testUser.username && password === 'passwordOK') {
        return '';
      }
      return invalidCredentials;
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

const passesIfAdmin = async function (action: string, idParam: string | undefined, body: Record<string, unknown> | undefined): Promise<void> {
  data.user_[0] = { ...testUser, admin: true };
  let next = false;
  const req = buildRequestForUserAction('valid_admin_token', action, idParam, body);
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertPass(next, res);
  if (idParam || !!req.body?.id) {
    const id = idParam ?? req.body?.id ?? [];
    expect(req.body?.id).toBe(id === 'self' ? testUser.id : id);
  }
};

const passesIfSelf = async function (action: string, idParam: string | undefined, body: Record<string, unknown> | undefined): Promise<void> {
  data.user_[0] = { ...testUser, admin: false };
  let next = false;
  const req = buildRequestForUserAction('valid_user_token', action, idParam, body);
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertPass(next, res);
  if (!!idParam || !!req.body?.id) {
    expect(req.body?.id).toBe(testUser.id);
  }
};

const passesIfSelfAndValidPassword = async function (): Promise<void> {
  data.user_[0] = { ...testUser, admin: false };
  let next = false;
  const req = buildRequestForUserAction('valid_user_token', 'change-password', undefined, {
    id: 'self',
    oldPassword: 'passwordOK',
    newPassword: '12345678'
  });
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertPass(next, res);
  expect(req.body?.id).toBe(testUser.id);
};

const rejectsIfSelfAndInvalidPassword = async function (): Promise<void> {
  data.user_[0] = { ...testUser, admin: false };
  let next = false;
  const req = buildRequestForUserAction('valid_user_token', 'change-password', undefined, {
    id: 'self',
    oldPassword: 'invalidPassword',
    newPassword: '12345678'
  });
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertUnauthorized(next, res, 'You have to provide your password');
};

const rejectsIfForeign = async function (action: string, idParam: boolean, body: Record<string, unknown> | undefined): Promise<void> {
  data.user_[0] = { ...testUser, admin: false };
  let next = false;
  const req = buildRequestForUserAction('valid_user_token', action, idParam ? otherId : undefined, body);
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertUnauthorized(next, res, 'You have to be admin');
};

const rejectsIfNotAdmin = async function (action: string, body: Record<string, unknown> | undefined): Promise<void> {
  data.user_[0] = { ...testUser, admin: false };
  let next = false;
  const req = buildRequestForUserAction('valid_user_token', action, 'self', body);
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertUnauthorized(next, res, 'You have to be admin');
};

const rejectsIfPublic = async function (action: string, body: Record<string, unknown> | undefined): Promise<void> {
  let next = false;
  const req = buildRequestForUserAction('', action, 'self', body);
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertUnauthorized(next, res, 'You have to be logged in');
};

describe('userMiddleware', (): void => {
  beforeEach(async () => {
    data.user_ = [];
  });

  afterEach(async () => {
    data.user_ = [];
    mocked_token = null;
    mocked_user = null;
    resetLastMessage();
  });

  describe('route add', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('add', undefined, { username: 'newUsername', password: '12345678', admin: false, meta: {} });
    });

    test('rejects if logged-in user is not admin.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfNotAdmin('add', { username: 'newUsername', password: '12345678', admin: false, meta: {} });
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('add', { username: 'newUsername', password: '12345678', admin: false, meta: {} });
    });
  });

  describe('route set-admin', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('set-admin', undefined, { id: testUser.id, admin: false });
    });

    test('rejects if logged-in user is not admin.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfNotAdmin('set-admin', { id: testUser.id, admin: false });
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('set-admin', { id: testUser.id, admin: false });
    });
  });

  describe('route list', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('list', undefined, undefined);
    });

    test('rejects if logged-in user is not admin.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfNotAdmin('list', undefined);
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('list', undefined);
    });
  });

  describe('route change-username', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('change-username', undefined, { id: testUser.id, newUsername: 'newUsername' });
    });

    test('passes if self.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await passesIfSelf('change-username', undefined, { id: testUser.id, newUsername: 'newUsername' });
    });

    test('rejects if foreign.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfForeign('change-username', false, { id: otherId, newUsername: 'newUsername' });
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('change-username', { id: testUser.id, newUsername: 'newUsername' });
    });
  });

  describe('route save-meta', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('save-meta', testUser.id, { meta: {} });
    });

    test('passes if self.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await passesIfSelf('save-meta', 'self', { meta: {} });
    });

    test('rejects if foreign.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfForeign('save-meta', true, { meta: {} });
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('save-meta', { meta: {} });
    });
  });

  describe('route load-meta', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('load-meta', testUser.id, undefined);
    });

    test('passes if self.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await passesIfSelf('load-meta', 'self', undefined);
    });

    test('rejects if foreign.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfForeign('load-meta', true, undefined);
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('load-meta', undefined);
    });
  });

  describe('route load', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('load', testUser.id, undefined);
    });

    test('passes if self.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await passesIfSelf('load', 'self', undefined);
    });

    test('rejects if foreign.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfForeign('load', true, undefined);
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('load', undefined);
    });
  });

  describe('route remove', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('remove', testUser.id, undefined);
    });

    test('passes if self.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await passesIfSelf('remove', 'self', undefined);
    });

    test('rejects if foreign.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfForeign('remove', true, undefined);
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('remove', undefined);
    });
  });

  describe('route change-password', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('change-password', undefined, { id: otherId, newPassword: '12345678', oldPassword: '87654321' });
    });

    test('passes if self and valid password.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await passesIfSelfAndValidPassword();
    });

    test('rejects if self and invalid password.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfSelfAndInvalidPassword();
    });

    test('rejects if foreign.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfForeign('delete', true, { id: 'other', newPassword: '12345678', oldPassword: '87654321' });
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('delete', { id: 'other', newPassword: '12345678', oldPassword: '87654321' });
    });
  });

  describe('validation errors', (): void => {
    test('add', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      let next = false;
      const schema = { username: usernameConstraint, password: requiredPasswordConstraint, meta: metaConstraint, admin: adminConstraint };
      const body = { username: 'username', meta: { some: 'value' }, admin: false };
      const req = buildRequestForUserAction('valid_admin_token', 'add', undefined, body);
      const res = buildResponse();

      await userMiddleware(req, res, () => (next = true));

      assertValidationError(res, 'body', schema, body);
      expect(next).toBe(false);
    });

    test('change-username', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      let next = false;
      const schema = { id: idConstraint, newUsername: usernameConstraint };
      const body = { id: 'xyz', newUsername: 'abcde' };
      const req = buildRequestForUserAction('valid_admin_token', 'change-username', undefined, body);
      const res = buildResponse();

      await userMiddleware(req, res, () => (next = true));

      assertValidationError(res, 'body', schema, body);
      expect(next).toBe(false);
    });

    test('change-password', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      let next = false;
      const schema = { id: idConstraint, newPassword: requiredPasswordConstraint, oldPassword: passwordConstraint };
      const body = { id: 'sel', newPassword: '123456789' };
      const req = buildRequestForUserAction('valid_admin_token', 'change-password', undefined, body);
      const res = buildResponse();

      await userMiddleware(req, res, () => (next = true));

      assertValidationError(res, 'body', schema, body);
      expect(next).toBe(false);
    });

    test('set-admin', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      let next = false;
      const schema = { id: idConstraint, admin: requiredAdminConstraint };
      const body = { id: 'self', admin: 'yes' };
      const req = buildRequestForUserAction('valid_admin_token', 'set-admin', undefined, body);
      const res = buildResponse();

      await userMiddleware(req, res, () => (next = true));

      assertValidationError(res, 'body', schema, body);
      expect(next).toBe(false);
    });

    test('save-meta, body', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      let next = false;
      const schema = { meta: metaConstraint };
      const body = { meta: '' };
      const req = buildRequestForUserAction('valid_admin_token', 'save-meta', testUser.id, body);
      const res = buildResponse();

      await userMiddleware(req, res, () => (next = true));

      assertValidationError(res, 'body', schema, body);
      expect(next).toBe(false);
    });

    test('save-meta, path params', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      let next = false;
      const schema = { id: idConstraint };
      const req = buildRequestForUserAction('valid_admin_token', 'save-meta', '', { meta: {} });
      const res = buildResponse();

      await userMiddleware(req, res, () => (next = true));

      assertValidationError(res, 'path parameter', schema, { id: '' });
      expect(next).toBe(false);
    });

    test('load-meta', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      let next = false;
      const schema = { id: idConstraint };
      const req = buildRequestForUserAction('valid_admin_token', 'load-meta', undefined, undefined);
      const res = buildResponse();

      await userMiddleware(req, res, () => (next = true));

      assertValidationError(res, 'path parameter', schema, {});
      expect(next).toBe(false);
    });

    test('load', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      let next = false;
      const schema = { id: idConstraint };
      const req = buildRequestForUserAction('valid_admin_token', 'load', undefined, undefined);
      const res = buildResponse();

      await userMiddleware(req, res, () => (next = true));

      assertValidationError(res, 'path parameter', schema, {});
      expect(next).toBe(false);
    });

    test('remove', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      let next = false;
      const schema = { id: idConstraint };
      const req = buildRequestForUserAction('valid_admin_token', 'remove', undefined, undefined);
      const res = buildResponse();

      await userMiddleware(req, res, () => (next = true));

      assertValidationError(res, 'path parameter', schema, {});
      expect(next).toBe(false);
    });
  });
});
