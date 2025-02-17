import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import { assertError, assertOK, assertUnauthorized, buildRequestForUserAction, buildResponse, resetLastMessage } from '#/server/expressTestUtils';
import {
  addUserHandler,
  changePasswordHandler,
  changeUsernameHandler,
  deleteUserHandler,
  getUserHandler,
  getUsersHandler,
  loadMetaHandler,
  loginHandler,
  registerHandler,
  saveMetaHandler,
  setAdminStateHandler
} from '@/server/handler/user';
import { testUser } from '#/testItems';
import User from '@/types/user/User';
import { attemptsExceeded, invalidCredentials } from '@/user';
import { Logger } from '@/logging/Logger';

const id = testUser.id;
const username = 'testUser';
const newUsername = 'newUsername';
const password = '123';
const admin = false;
const meta = { k: 'v' };
const newMeta = { abc: 123 };

let mock_loggedWarnMessage = '';
let mock_loggedWarnMeta: Record<string, unknown> | undefined;
let mock_loggedErrorMessage = '';
let mock_loggedErrorMeta: Record<string, unknown> | undefined;

jest.mock('@/user/passwordHashing/versions', () => {
  return {
    versions: {},
    current: {
      version: 'testVersion',
      async hashPassword(password: string): Promise<[string, string]> {
        return [`salt.${password}`, `hash.${password}`];
      },
      async checkPassword(password: string, salt: string, hash: string): Promise<boolean> {
        return password.length > 0 && salt.length > 0 && hash.length > 0;
      }
    }
  };
});

jest.mock('@/user/auth', () => {
  const actual = jest.requireActual('@/user/auth');
  return {
    ...actual,
    login(username: string, password: string) {
      if (username === 'locked') {
        return attemptsExceeded;
      }
      if (username.length > 0 && password.length > 0) {
        return `token.${username}.${password}`;
      }
      return invalidCredentials;
    }
  };
});

jest.mock('@/user/jwt', () => {
  const actual = jest.requireActual('@/user/jwt');
  // noinspection JSUnusedGlobalSymbols
  return {
    ...actual,
    getExpiresAt() {
      return 42_000;
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
    warn(message: string, meta?: Record<string, unknown>) {
      mock_loggedWarnMessage = message;
      mock_loggedWarnMeta = meta;
      return this;
    },
    error(message: string, meta?: Record<string, unknown>) {
      mock_loggedErrorMessage = message;
      mock_loggedErrorMeta = meta;
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

describe('user handlers', (): void => {
  afterEach(async () => {
    data.user_ = [];
    resetLastMessage();
    mock_loggedWarnMessage = '';
    mock_loggedWarnMeta = undefined;
    mock_loggedErrorMessage = '';
    mock_loggedErrorMeta = undefined;
  });

  describe('registerHandler', (): void => {
    test('registers User if it does not exist already, warning about short password.', async (): Promise<void> => {
      const req = buildRequestForUserAction('valid_admin_token', 'register', undefined, { username, password, meta });
      const res = buildResponse();

      await registerHandler(req, res);

      assertOK(res, { username });
      expect((data.user_?.at(0) as User)?.username).toBe(username);
      expect(mock_loggedWarnMessage).toBe('Password is a bit short. Consider password rules implementation.');
      expect(mock_loggedWarnMeta).toEqual({ length: 3 });
    });

    test('registers User if it does not exist already, not warning about short password.', async (): Promise<void> => {
      const req = buildRequestForUserAction('valid_admin_token', 'register', undefined, { username, password: '-'.repeat(10), meta });
      const res = buildResponse();

      await registerHandler(req, res);

      assertOK(res, { username });
      expect((data.user_?.at(0) as User)?.username).toBe(username);
      expect(mock_loggedWarnMessage).toBe('');
      expect(mock_loggedWarnMeta).toBeUndefined();
    });

    test('rejects if user does exist already.', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      const req = buildRequestForUserAction('valid_admin_token', 'register', undefined, { username, password, meta });
      const res = buildResponse();

      await registerHandler(req, res);

      assertError(res, 'User testUser exists already');
      expect(data.user_?.length).toBe(1);
      expect(mock_loggedErrorMessage).toBe('Error. User testUser exists already.');
      expect(mock_loggedErrorMeta).toEqual({ statusCode: 400 });
    });
  });

  describe('addUserHandler', (): void => {
    test('adds User if it does not exist already, admin, warning about short password.', async (): Promise<void> => {
      const req = buildRequestForUserAction('valid_admin_token', 'add', undefined, { username, password, meta, admin: true });
      const res = buildResponse();

      await addUserHandler(req, res);

      assertOK(res, { username });
      expect((data.user_?.at(0) as User)?.username).toBe(username);
      expect((data.user_?.at(0) as User)?.admin).toBe(true);
      expect(mock_loggedWarnMessage).toBe('Password is a bit short. Consider password rules implementation.');
      expect(mock_loggedWarnMeta).toEqual({ length: 3 });
    });

    test('adds User if it does not exist already, admin, not warning about short password.', async (): Promise<void> => {
      const req = buildRequestForUserAction('valid_admin_token', 'add', undefined, { username, password: '-'.repeat(10), meta, admin: true });
      const res = buildResponse();

      await addUserHandler(req, res);

      assertOK(res, { username });
      expect((data.user_?.at(0) as User)?.username).toBe(username);
      expect((data.user_?.at(0) as User)?.admin).toBe(true);
      expect(mock_loggedWarnMessage).toBe('');
      expect(mock_loggedWarnMeta).toBeUndefined();
    });

    test('adds User if it does not exist already, normal user.', async (): Promise<void> => {
      const req = buildRequestForUserAction('valid_admin_token', 'add', undefined, { username, password, meta, admin });
      const res = buildResponse();

      await addUserHandler(req, res);

      assertOK(res, { username });
      expect((data.user_?.at(0) as User)?.username).toBe(username);
      expect((data.user_?.at(0) as User)?.admin).toBe(false);
    });

    test('rejects if user does exist already.', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      const req = buildRequestForUserAction('valid_admin_token', 'add', undefined, { username, password, meta, admin });
      const res = buildResponse();

      await addUserHandler(req, res);

      assertError(res, 'User testUser exists already');
      expect(data.user_?.length).toBe(1);
    });
  });

  describe('changeUsernameHandler', (): void => {
    test('changes username if new username is not taken', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      const req = buildRequestForUserAction('valid_admin_token', 'change-username', undefined, { id, newUsername });
      const res = buildResponse();

      await changeUsernameHandler(req, res);

      assertOK(res, { username: newUsername });
      expect((data.user_?.at(0) as User)?.username).toBe(newUsername);
    });

    test('rejects if new username is taken', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      data.user_[1] = { ...testUser, username: newUsername };
      const req = buildRequestForUserAction('valid_admin_token', 'change-username', undefined, { id, newUsername });
      const res = buildResponse();

      await changeUsernameHandler(req, res);

      assertError(res, `There is always a user with name ${newUsername}`);
      expect((data.user_?.at(0) as User)?.username).toBe(username);
      expect((data.user_?.at(1) as User)?.username).toBe(newUsername);
    });
  });

  describe('changePasswordHandler', (): void => {
    test('changes password, warning about short password', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      const req = buildRequestForUserAction('valid_admin_token', 'change-password', undefined, { id, newPassword: 'newPasswd' });
      const res = buildResponse();

      await changePasswordHandler(req, res);

      assertOK(res);
      expect((data.user_?.at(0) as User)?.hashVersion).toBe('testVersion');
      expect((data.user_?.at(0) as User)?.salt).toBe('salt.newPasswd');
      expect((data.user_?.at(0) as User)?.hash).toBe('hash.newPasswd');
      expect(mock_loggedWarnMessage).toBe('Password is a bit short. Consider password rules implementation.');
      expect(mock_loggedWarnMeta).toEqual({ length: 9 });
    });

    test('changes password, not warning about short password', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      const req = buildRequestForUserAction('valid_admin_token', 'change-password', undefined, { id, newPassword: 'newPassword' });
      const res = buildResponse();

      await changePasswordHandler(req, res);

      assertOK(res);
      expect((data.user_?.at(0) as User)?.hashVersion).toBe('testVersion');
      expect((data.user_?.at(0) as User)?.salt).toBe('salt.newPassword');
      expect((data.user_?.at(0) as User)?.hash).toBe('hash.newPassword');
      expect(mock_loggedWarnMessage).toBe('');
      expect(mock_loggedWarnMeta).toBeUndefined();
    });
  });

  describe('setAdminStateHandler', (): void => {
    test('changes admin state', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      const req = buildRequestForUserAction('valid_admin_token', 'set-admin', undefined, { id, admin: true });
      const res = buildResponse();

      await setAdminStateHandler(req, res);

      assertOK(res);
      expect((data.user_?.at(0) as User)?.admin).toBe(true);
    });
  });

  describe('saveMetaHandler', (): void => {
    test('saves meta', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      const req = buildRequestForUserAction('valid_admin_token', 'save-meta', id, { id, meta: newMeta });
      const res = buildResponse();

      await saveMetaHandler(req, res);

      assertOK(res);
      expect((data.user_?.at(0) as User)?.meta).toEqual(newMeta);
    });
  });

  describe('loadMetaHandler', (): void => {
    test('loads meta', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      const req = buildRequestForUserAction('valid_admin_token', 'load-meta', id, { id });
      const res = buildResponse();

      await loadMetaHandler(req, res);

      assertOK(res, { meta: testUser.meta });
    });
  });

  describe('getUserHandler', (): void => {
    test('gets user dto', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      const req = buildRequestForUserAction('valid_admin_token', 'one', id, { id });
      const res = buildResponse();

      await getUserHandler(req, res);

      assertOK(res, { user: { ...testUser, hashVersion: undefined, salt: undefined, hash: undefined } });
    });
  });

  describe('getUsersHandler', (): void => {
    test('gets user list', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      data.user_[1] = { ...testUser, id: 'id2', username: 'someAdmin', admin: true };
      const req = buildRequestForUserAction('valid_admin_token', 'list', undefined, {});
      const res = buildResponse();

      await getUsersHandler(req, res);

      assertOK(res, {
        users: [
          { id, username, admin },
          { id: 'id2', username: 'someAdmin', admin: true }
        ]
      });
    });
  });

  describe('deleteUserHandler', (): void => {
    test('deletes user', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      data.user_[1] = { ...testUser, username: 'other' };
      const req = buildRequestForUserAction('valid_admin_token', 'one', id, { id });
      const res = buildResponse();

      await deleteUserHandler(req, res);

      assertOK(res);
      expect(data.user_.length).toBe(1);
      expect((data.user_?.at(0) as User)?.username).toEqual('other');
    });
  });

  describe('loginHandler', (): void => {
    test('logs user in if password is valid', async (): Promise<void> => {
      const req = buildRequestForUserAction('valid_admin_token', 'login', undefined, { username, password });
      const res = buildResponse();

      await loginHandler(req, res);

      assertOK(res, { token: `token.${username}.${password}`, expiresAt: 42_000 });
    });

    test('rejects if password is invalid', async (): Promise<void> => {
      const req = buildRequestForUserAction('valid_admin_token', 'login', undefined, { username: '', password: '' });
      const res = buildResponse();

      await loginHandler(req, res);

      assertUnauthorized(undefined, res, 'invalid credentials provided');
    });

    test('rejects if attempts exceeded', async (): Promise<void> => {
      const req = buildRequestForUserAction('valid_admin_token', 'login', undefined, { username: 'locked', password: '123' });
      const res = buildResponse();

      await loginHandler(req, res);

      assertUnauthorized(undefined, res, 'Login attempts exceeded for username locked');
    });
  });
});
