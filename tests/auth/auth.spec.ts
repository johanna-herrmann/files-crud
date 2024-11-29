import { register, login, invalidCredentials, lockedExceeded } from '@/auth/auth';
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

jest.mock('@/config', () => {
  return {
    loadConfig() {},
    getConfig() {
      return {};
    }
  };
});

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
  return {
    issueToken(username: string) {
      return `token for ${username}`;
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
    const created = await register(username, password, false, { k: 'v' });

    expect(tables.user.testUser).toEqual({ username, hashVersion, salt, hash, ownerId, admin: false, meta });
    expect(created).toBe(true);
  });

  test('register registers new admin.', async (): Promise<void> => {
    const created = await register(username, password, true);

    expect(tables.user.testUser).toEqual({ username, hashVersion, salt, hash, ownerId, admin: true, meta: {} });
    expect(created).toBe(true);
  });

  test('register rejects if user already exists.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: false, meta: {} };

    const created = await register(username, password, true);

    expect(created).toBe(false);
    expect(tables.user.testUser?.admin).toBe(false);
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
});
