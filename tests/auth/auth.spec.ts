import {
  register,
  login,
  registerRestrictedAdmin,
  registerRestrictedToken,
  userAlreadyExists,
  invalidCredentials,
  lockedExceeded,
  getLoggedInUser
} from '@/auth/auth';
import { issueToken } from '@/auth/jwt';
import { loadConfig } from '@/config';
import { tables } from '@/database/memdb/MemoryDatabase';
import Database from '@/types/Database';

const username = 'testUser';
const password = 'testPwd';
const hashVersion = 'v1';
const salt = 'YWFhYWFhYWFhYWFhYWFhYQ==';
const hash = 'O8fICNHvM2AlfcoaHUamNo5JQJamdZMz0YXMLrnoH/w=';
const ownerId = 'test-id';
const meta = { k: 'v' };

let mocked_called_count = false;
let mocked_called_reset = false;
let mocked_locked = false;

jest.mock('uuid', () => {
  const actual = jest.requireActual('uuid');
  return {
    ...actual,
    v4() {
      return 'test-id';
    }
  };
});

jest.mock('@/auth/jwt', () => {
  const actual = jest.requireActual('@/auth/jwt');
  return {
    ...actual,
    issueToken(username: string) {
      if (username.startsWith('real_')) {
        return actual.issueToken(username.substring(5));
      }
      return `token for ${username}`;
    },
    verifyToken(token: string | null) {
      if (token?.startsWith('valid_')) {
        return true;
      }
      if (token?.startsWith('invalid_')) {
        return false;
      }
      return actual.verifyToken(token);
    },
    extractUsername(token: string) {
      if (token?.startsWith('valid_')) {
        return token.substring(6);
      }
      return actual.extractUsername(token);
    }
  };
});

jest.mock('@/auth/locking', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async countAttempt(db: Database, username: string) {
      mocked_called_count = true;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async resetAttempts(db: Database, username: string) {
      mocked_called_reset = true;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleLocking(db: Database, username: string) {
      return mocked_locked;
    }
  };
});

jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes(size: number) {
      return Buffer.from('a'.repeat(size), 'utf8');
    }
  };
});

describe('auth', (): void => {
  beforeEach(async (): Promise<void> => {
    tables.user = {};
    mocked_called_count = false;
    mocked_called_reset = false;
    mocked_locked = false;
  });

  test('register registers new user.', async (): Promise<void> => {
    const result = await register(username, password, false, { k: 'v' });

    expect(tables.user.testUser).toEqual({ username, hashVersion, salt, hash, ownerId, admin: false, meta });
    expect(result).toBe('');
  });

  test('register registers new admin.', async (): Promise<void> => {
    const result = await register(username, password, true, {});

    expect(tables.user.testUser).toEqual({ username, hashVersion, salt, hash, ownerId, admin: true, meta: {} });
    expect(result).toBe('');
  });

  test('register rejects if user already exists.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };

    const result = await register(username, password, false, {});

    expect(result).toBe(userAlreadyExists);
    expect(tables.user.testUser?.admin).toBe(true);
  });

  test('register rejects if register is restricted to admins and there is no login.', async (): Promise<void> => {
    loadConfig({ register: 'admin' });

    const result = await register(username, password, false, {});

    expect(result).toBe(registerRestrictedAdmin);
    expect(tables.user.testUser).toBeUndefined();
  });

  test('register rejects if register is restricted to admins and user is not an admin.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: false, meta: {} };
    loadConfig({ register: 'admin' });

    const result = await register('someName', password, false, {}, { jwt: `valid_${username}` });

    expect(result).toBe(registerRestrictedAdmin);
    expect(tables.user.someName).toBeUndefined();
  });

  test('register registers user if register is restricted to admins and user is admin.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };
    loadConfig({ register: 'admin' });

    const result = await register('someName', password, false, {}, { jwt: `valid_${username}` });

    expect(result).toBe('');
    expect(tables.user.someName?.username).toBe('someName');
  });

  test('register rejects if register is restricted to token and no token provided.', async (): Promise<void> => {
    loadConfig({ register: 'token' });

    const result = await register(username, password, false, {});

    expect(result).toBe(registerRestrictedToken);
    expect(tables.user.testUser).toBeUndefined();
  });

  test('register rejects if register is restricted to token and invalid token provided.', async (): Promise<void> => {
    loadConfig({ register: 'token', tokens: ['foo'] });

    const result = await register(username, password, false, {}, { register: 'bar' });

    expect(result).toBe(registerRestrictedToken);
    expect(tables.user.testUser).toBeUndefined();
  });

  test('register registers user if register is restricted to token and valid token provided.', async (): Promise<void> => {
    loadConfig({ register: 'token', tokens: ['foo'] });

    const result = await register(username, password, false, {}, { register: 'foo' });

    expect(result).toBe('');
    expect(tables.user.testUser?.username).toBe(username);
  });

  test('login returns token on valid credentials.', async (): Promise<void> => {
    mocked_locked = false;
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };

    const result = await login(username, password);

    expect(result).toBe(`token for ${username}`);
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(true);
  });

  test('login returns invalidCredentials on invalid password.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };
    mocked_locked = false;

    const result = await login(username, 'invalid');

    expect(result).toBe(invalidCredentials);
    expect(mocked_called_count).toBe(true);
    expect(mocked_called_reset).toBe(false);
  });

  test('login returns invalidCredentials on invalid username.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };
    mocked_locked = false;

    const result = await login('invalid', password);

    expect(result).toBe(invalidCredentials);
    expect(mocked_called_count).toBe(true);
    expect(mocked_called_reset).toBe(false);
  });

  test('login returns invalidCredentials on invalid credentials.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };
    mocked_locked = false;

    const result = await login('invalid', 'invalid');

    expect(result).toBe(invalidCredentials);
    expect(mocked_called_count).toBe(true);
    expect(mocked_called_reset).toBe(false);
  });

  test('login returns attemptsExceeded if locked.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };
    mocked_locked = true;

    const result = await login(username, password);

    expect(result).toBe(lockedExceeded);
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });

  test('getLoggedInUser returns user if logged in.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };
    mocked_locked = false;
    const token = issueToken(`real_${username}`);

    const user = await getLoggedInUser(token);

    expect(user?.username).toBe(username);
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });

  test('getLoggedInUser returns null if logged-in user does not exist.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };
    mocked_locked = false;
    const token = issueToken(`real_other`);

    const user = await getLoggedInUser(token);

    expect(user).toBeNull();
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });

  test('getLoggedInUser returns null if token is invalid.', async (): Promise<void> => {
    mocked_locked = false;
    const token = issueToken(`real_${username}`);

    const user = await getLoggedInUser(token.substring(0, token.length - 2));

    expect(user).toBeNull();
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });

  test('getLoggedInUser returns null if token is empty.', async (): Promise<void> => {
    mocked_locked = false;

    const user = await getLoggedInUser('');

    expect(user).toBeNull();
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });

  test('getLoggedInUser returns null if no token.', async (): Promise<void> => {
    mocked_locked = false;

    const user = await getLoggedInUser(null);

    expect(user).toBeNull();
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });
});
