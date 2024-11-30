import { addUser, register, login, userAlreadyExists, invalidCredentials, attemptsExceeded, authorize } from '@/auth/auth';
import { issueToken } from '@/auth/jwt';
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

  test('addUser adds new user.', async (): Promise<void> => {
    const added = await addUser(username, password, false, meta);

    expect(tables.user.testUser?.username).toEqual(username);
    expect(tables.user.testUser?.admin).toEqual(false);
    expect(added).toBe(true);
  });

  test('addUser adds new admin.', async (): Promise<void> => {
    const added = await addUser(username, password, true, meta);

    expect(tables.user.testUser?.username).toEqual(username);
    expect(tables.user.testUser?.admin).toEqual(true);
    expect(added).toBe(true);
  });

  test('addUser rejects if user already exist.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };

    const added = await addUser(username, password, false, meta);

    expect(tables.user.testUser?.admin).toEqual(true);
    expect(added).toBe(false);
  });

  test('register registers new user.', async (): Promise<void> => {
    const result = await register(username, password, { k: 'v' });

    expect(tables.user.testUser).toEqual({ username, hashVersion, salt, hash, ownerId, admin: false, meta });
    expect(result).toBe('');
  });

  test('register rejects if user already exists.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };

    const result = await register(username, password, {});

    expect(result).toBe(userAlreadyExists);
    expect(tables.user.testUser?.admin).toBe(true);
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

    expect(result).toBe(attemptsExceeded);
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });

  test('authorize returns user if logged in.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };
    mocked_locked = false;
    const token = issueToken(`real_${username}`);

    const user = await authorize(token);

    expect(user?.username).toBe(username);
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });

  test('authorize returns null if logged-in user does not exist.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };
    mocked_locked = false;
    const token = issueToken(`real_other`);

    const user = await authorize(token);

    expect(user).toBeNull();
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });

  test('authorize returns null if token is invalid.', async (): Promise<void> => {
    mocked_locked = false;
    const token = issueToken(`real_${username}`);

    const user = await authorize(token.substring(0, token.length - 2));

    expect(user).toBeNull();
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });

  test('authorize returns null if token is empty.', async (): Promise<void> => {
    mocked_locked = false;

    const user = await authorize('');

    expect(user).toBeNull();
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });

  test('authorize returns null if no token.', async (): Promise<void> => {
    mocked_locked = false;

    const user = await authorize(null);

    expect(user).toBeNull();
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });
});
