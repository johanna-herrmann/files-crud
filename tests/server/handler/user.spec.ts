import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import { assertError, assertOK, buildRequestForUserAction, buildResponse, resetLastMessage } from '#/server/expressTestUtils';
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

const username = 'testUser';
const newUsername = 'newUsername';
const password = '123';
const admin = false;
const meta = { k: 'v' };
const newMeta = { abc: 123 };

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

describe('user handlers', (): void => {
  afterEach(async () => {
    data.user_ = [];
    resetLastMessage();
  });

  describe('registerHandler', (): void => {
    test('registers User if it does not exist already.', async (): Promise<void> => {
      const req = buildRequestForUserAction('valid_admin_token', 'register', undefined, { username, password, meta });
      const res = buildResponse();

      await registerHandler(req, res);

      assertOK(res, { username });
      expect((data.user_?.at(0) as User)?.username).toBe(username);
    });

    test('rejects if user does exist already.', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      const req = buildRequestForUserAction('valid_admin_token', 'register', undefined, { username, password, meta });
      const res = buildResponse();

      await registerHandler(req, res);

      assertError(res, 'User testUser exists already');
      expect(data.user_?.length).toBe(1);
    });
  });

  describe('addUserHandler', (): void => {
    test('adds User if it does not exist already, admin.', async (): Promise<void> => {
      const req = buildRequestForUserAction('valid_admin_token', 'add', undefined, { username, password, meta, admin: true });
      const res = buildResponse();

      await addUserHandler(req, res);

      assertOK(res, { username });
      expect((data.user_?.at(0) as User)?.username).toBe(username);
      expect((data.user_?.at(0) as User)?.admin).toBe(true);
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
      const req = buildRequestForUserAction('valid_admin_token', 'change-username', undefined, { username, newUsername });
      const res = buildResponse();

      await changeUsernameHandler(req, res);

      assertOK(res, { username: newUsername });
      expect((data.user_?.at(0) as User)?.username).toBe(newUsername);
    });

    test('rejects if new username is taken', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      data.user_[1] = { ...testUser, username: newUsername };
      const req = buildRequestForUserAction('valid_admin_token', 'change-username', undefined, { username, newUsername });
      const res = buildResponse();

      await changeUsernameHandler(req, res);

      assertError(res, `There is always a user with name ${newUsername}`);
      expect((data.user_?.at(0) as User)?.username).toBe(username);
      expect((data.user_?.at(1) as User)?.username).toBe(newUsername);
    });
  });

  describe('changePasswordHandler', (): void => {
    test('changes password', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      const req = buildRequestForUserAction('valid_admin_token', 'change-password', undefined, { username, newPassword: 'newPassword' });
      const res = buildResponse();

      await changePasswordHandler(req, res);

      assertOK(res);
      expect((data.user_?.at(0) as User)?.hashVersion).toBe('testVersion');
      expect((data.user_?.at(0) as User)?.salt).toBe('salt.newPassword');
      expect((data.user_?.at(0) as User)?.hash).toBe('hash.newPassword');
    });
  });

  describe('setAdminStateHandler', (): void => {
    test('changes admin state', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      const req = buildRequestForUserAction('valid_admin_token', 'set-admin', undefined, { username, admin: true });
      const res = buildResponse();

      await setAdminStateHandler(req, res);

      assertOK(res);
      expect((data.user_?.at(0) as User)?.admin).toBe(true);
    });
  });

  describe('saveMetaHandler', (): void => {
    test('saves meta', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      const req = buildRequestForUserAction('valid_admin_token', 'save-meta', username, { meta: newMeta });
      const res = buildResponse();

      await saveMetaHandler(req, res);

      assertOK(res);
      expect((data.user_?.at(0) as User)?.meta).toEqual(newMeta);
    });
  });

  describe('loadMetaHandler', (): void => {
    test('loads meta', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      const req = buildRequestForUserAction('valid_admin_token', 'load-meta', username, {});
      const res = buildResponse();

      await loadMetaHandler(req, res);

      assertOK(res, { meta: testUser.meta });
    });
  });

  describe('getUserHandler', (): void => {
    test('gets user dto', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      const req = buildRequestForUserAction('valid_admin_token', 'one', username, {});
      const res = buildResponse();

      await getUserHandler(req, res);

      assertOK(res, { user: { ...testUser, hashVersion: undefined, salt: undefined, hash: undefined } });
    });
  });

  describe('getUsersHandler', (): void => {
    test('gets user list', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      data.user_[1] = { ...testUser, username: 'someAdmin', admin: true };
      const req = buildRequestForUserAction('valid_admin_token', 'list', undefined, {});
      const res = buildResponse();

      await getUsersHandler(req, res);

      assertOK(res, {
        users: [
          { username, admin },
          { username: 'someAdmin', admin: true }
        ]
      });
    });
  });

  describe('deleteUserHandler', (): void => {
    test('deletes user', async (): Promise<void> => {
      data.user_[0] = { ...testUser };
      data.user_[1] = { ...testUser, username: 'other' };
      const req = buildRequestForUserAction('valid_admin_token', 'one', username, {});
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

      assertOK(res, { token: `token.${username}.${password}` });
    });

    test('rejects if password is invalid', async (): Promise<void> => {
      const req = buildRequestForUserAction('valid_admin_token', 'login', undefined, { username: '', password: '' });
      const res = buildResponse();

      await loginHandler(req, res);

      assertError(res, 'invalid credentials provided');
    });

    test('rejects if attempts exceeded', async (): Promise<void> => {
      const req = buildRequestForUserAction('valid_admin_token', 'login', undefined, { username: 'locked', password: '123' });
      const res = buildResponse();

      await loginHandler(req, res);

      assertError(res, 'Login attempts exceeded for username locked');
    });
  });
});
