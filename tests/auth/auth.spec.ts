import { register, login } from '@/auth/auth';
import { tables } from '@/database/memdb/MemoryDatabase';

const username = 'testUser';
const password = 'testPwd';
const hashVersion = 'v1';
const salt = 'YWFhYWFhYWFhYWFhYWFhYQ==';
const hash = 'O8fICNHvM2AlfcoaHUamNo5JQJamdZMz0YXMLrnoH/w=';
const ownerId = 'test-id';
const meta = { k: 'v' };

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
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };

    const token = await login(username, password);

    expect(token).toBe(`token for ${username}`);
  });

  test('login returns empty string on invalid password.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };

    const token = await login(username, 'invalid');

    expect(token).toBe('');
  });

  test('login returns empty string on invalid username.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };

    const token = await login('invalid', password);

    expect(token).toBe('');
  });

  test('login returns empty string on invalid credentials.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };

    const token = await login('invalid', 'invalid');

    expect(token).toBe('');
  });
});
