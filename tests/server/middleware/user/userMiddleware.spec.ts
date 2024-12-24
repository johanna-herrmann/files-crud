import User from '@/types/User';
import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import { testUser } from '#/testItems';
import { assertError, assertPass, buildRequestForUserAction, buildResponse, resetLastMessage } from '#/server/expressTestUtils';
import { userMiddleware } from '@/server/middleware';
import { invalidCredentials } from '@/user';

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

const passesIfAdmin = async function (action: string): Promise<void> {
  data.user_[0] = { ...testUser, admin: true };
  let next = false;
  const req = buildRequestForUserAction('valid_admin_token', action, undefined, {});
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertPass(next, res);
};

const passesIfSelf = async function (action: string, usernameParam: boolean): Promise<void> {
  data.user_[0] = { ...testUser, admin: false };
  let next = false;
  const username = testUser.username;
  const body = usernameParam ? {} : { username };
  const req = buildRequestForUserAction('valid_user_token', action, usernameParam ? username : undefined, body);
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertPass(next, res);
};

const passesIfSelfAndValidPassword = async function (): Promise<void> {
  data.user_[0] = { ...testUser, admin: false };
  let next = false;
  const req = buildRequestForUserAction('valid_user_token', 'change-password', undefined, { username: testUser.username, oldPassword: 'passwordOK' });
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertPass(next, res);
};

const rejectsIfSelfAndInvalidPassword = async function (): Promise<void> {
  data.user_[0] = { ...testUser, admin: false };
  let next = false;
  const req = buildRequestForUserAction('valid_user_token', 'change-password', undefined, { username: testUser.username, oldPassword: 'invalid' });
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertError(next, res, 'You have to provide your password');
};

const rejectsIfForeign = async function (action: string, usernameParam: boolean): Promise<void> {
  data.user_[0] = { ...testUser, admin: false };
  let next = false;
  const body = usernameParam ? {} : { username: 'other' };
  const req = buildRequestForUserAction('valid_user_token', action, usernameParam ? 'other' : undefined, body);
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertError(next, res, 'You have to be admin');
};

const rejectsIfNotAdmin = async function (action: string): Promise<void> {
  data.user_[0] = { ...testUser, admin: false };
  let next = false;
  const req = buildRequestForUserAction('valid_user_token', action, undefined, {});
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertError(next, res, 'You have to be admin');
};

const rejectsIfPublic = async function (action: string): Promise<void> {
  let next = false;
  const req = buildRequestForUserAction('', action, undefined, {});
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertError(next, res, 'You have to be logged in');
};

describe('userMiddleware', (): void => {
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
      await passesIfAdmin('add');
    });

    test('rejects if logged-in user is not admin.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfNotAdmin('add');
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('add');
    });
  });

  describe('route set-admin', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('set-admin');
    });

    test('rejects if logged-in user is not admin.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfNotAdmin('set-admin');
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('set-admin');
    });
  });

  describe('route list', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('list');
    });

    test('rejects if logged-in user is not admin.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfNotAdmin('list');
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('list');
    });
  });

  describe('route change-username', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('change-username');
    });

    test('passes if self.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await passesIfSelf('change-username', false);
    });

    test('rejects if foreign.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfForeign('change-username', false);
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('change-username');
    });
  });

  describe('route save-meta', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('save-meta');
    });

    test('passes if self.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await passesIfSelf('save-meta', false);
    });

    test('rejects if foreign.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfForeign('save-meta', false);
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('save-meta');
    });
  });

  describe('route load-meta', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('load-meta');
    });

    test('passes if self.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await passesIfSelf('load-meta', false);
    });

    test('rejects if foreign.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfForeign('load-meta', false);
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('load-meta');
    });
  });

  describe('route one', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('one');
    });

    test('passes if self.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await passesIfSelf('one', true);
    });

    test('rejects if foreign.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfForeign('one', true);
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('one');
    });
  });

  describe('route delete', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('delete');
    });

    test('passes if self.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await passesIfSelf('delete', true);
    });

    test('rejects if foreign.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await rejectsIfForeign('delete', true);
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('delete');
    });
  });

  describe('route change-password', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('change-password');
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
      await rejectsIfForeign('delete', true);
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('delete');
    });
  });
});
