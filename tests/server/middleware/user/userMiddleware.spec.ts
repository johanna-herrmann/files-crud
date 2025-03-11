import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import { testUser } from '#/testItems';
import { assertUnauthorized, assertPass, buildRequestForUserAction, buildResponse, resetLastMessage } from '#/server/expressTestUtils';
import { userMiddleware } from '@/server/middleware';
import { invalidCredentials } from '@/user';
import { Logger } from '@/logging/Logger';
import { User } from '@/types/user/User';

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

const passesIfAdmin = async function (action: string, idParam: string | undefined, idInBody: string | undefined): Promise<void> {
  data.user_[0] = { ...testUser, admin: true };
  let next = false;
  const req = buildRequestForUserAction('valid_admin_token', action, idParam, action === 'load' ? undefined : { id: idInBody });
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertPass(next, res);
  if (idParam || !!idInBody) {
    const id = idParam ?? idInBody ?? [];
    expect(req.body?.id).toBe(id === 'self' ? testUser.id : id);
  }
};

const passesIfSelf = async function (action: string, idParam: string | undefined, idInBody: string | undefined): Promise<void> {
  data.user_[0] = { ...testUser, admin: false };
  let next = false;
  const req = buildRequestForUserAction('valid_user_token', action, idParam, { id: idInBody });
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertPass(next, res);
  if (!!idParam || !!idInBody) {
    expect(req.body?.id).toBe(testUser.id);
  }
};

const passesIfSelfAndValidPassword = async function (): Promise<void> {
  data.user_[0] = { ...testUser, admin: false };
  let next = false;
  const req = buildRequestForUserAction('valid_user_token', 'change-password', undefined, { id: 'self', oldPassword: 'passwordOK' });
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertPass(next, res);
  expect(req.body?.id).toBe(testUser.id);
};

const rejectsIfSelfAndInvalidPassword = async function (): Promise<void> {
  data.user_[0] = { ...testUser, admin: false };
  let next = false;
  const req = buildRequestForUserAction('valid_user_token', 'change-password', undefined, { id: 'self', oldPassword: 'invalid' });
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertUnauthorized(next, res, 'You have to provide your password');
};

const rejectsIfForeign = async function (action: string, idParam: boolean): Promise<void> {
  data.user_[0] = { ...testUser, admin: false };
  let next = false;
  const body = idParam ? {} : { id: 'other' };
  const req = buildRequestForUserAction('valid_user_token', action, idParam ? 'other' : undefined, body);
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertUnauthorized(next, res, 'You have to be admin');
};

const rejectsIfNotAdmin = async function (action: string): Promise<void> {
  data.user_[0] = { ...testUser, admin: false };
  let next = false;
  const req = buildRequestForUserAction('valid_user_token', action, undefined, {});
  const res = buildResponse();

  await userMiddleware(req, res, () => (next = true));

  assertUnauthorized(next, res, 'You have to be admin');
};

const rejectsIfPublic = async function (action: string): Promise<void> {
  let next = false;
  const req = buildRequestForUserAction('', action, undefined, {});
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
      await passesIfAdmin('add', undefined, undefined);
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
      await passesIfAdmin('set-admin', undefined, testUser.id);
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
      await passesIfAdmin('list', undefined, undefined);
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
      await passesIfAdmin('change-username', undefined, testUser.id);
    });

    test('passes if self.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await passesIfSelf('change-username', undefined, 'self');
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
      await passesIfAdmin('save-meta', testUser.id, undefined);
    });

    test('passes if self.', async (): Promise<void> => {
      mocked_token = 'valid_user_token';
      mocked_user = { ...testUser, admin: false };
      await passesIfSelf('save-meta', 'self', undefined);
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
      await rejectsIfForeign('load-meta', false);
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('load-meta');
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
      await rejectsIfForeign('load', true);
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('load');
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
      await rejectsIfForeign('remove', true);
    });

    test('rejects on public call.', async (): Promise<void> => {
      await rejectsIfPublic('remove');
    });
  });

  describe('route change-password', (): void => {
    test('passes if logged-in user is admin.', async (): Promise<void> => {
      mocked_token = 'valid_admin_token';
      mocked_user = { ...testUser, admin: true };
      await passesIfAdmin('change-password', undefined, 'other');
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
