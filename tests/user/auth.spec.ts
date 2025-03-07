import { login, invalidCredentials, attemptsExceeded, authorize, changePassword, checkPassword } from '@/user/auth';
import { initKeys, issueToken, resetKeys } from '@/user/jwt';
import { current } from '@/user/passwordHashing/versions';
import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import { DatabaseType } from '@/types/database/DatabaseType';
import { User } from '@/types/user/User';

const username = 'testUser';
const password = 'testPwd';
const hashVersion = 'v1';
const salt = 'YWFhYWFhYWFhYWFhYWFhYQ==';
// noinspection SpellCheckingInspection
const hash = 'O8fICNHvM2AlfcoaHUamNo5JQJamdZMz0YXMLrnoH/w=';
const id = 'test-id';

let mocked_called_count = false;
let mocked_called_reset = false;
let mocked_locked = false;

jest.mock('@/user/jwt', () => {
  const actual = jest.requireActual('@/user/jwt');
  // noinspection JSUnusedGlobalSymbols - used outside
  return {
    ...actual,
    issueToken(id: string) {
      if (id.startsWith('real_')) {
        return actual.issueToken(id.substring(5));
      }
      return `token for ${id}`;
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

jest.mock('@/user/locking', () => {
  // noinspection JSUnusedGlobalSymbols - used outside
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async countAttempt(_db: DatabaseType, _username: string) {
      mocked_called_count = true;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async resetAttempts(_db: DatabaseType, _username: string) {
      mocked_called_reset = true;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleLocking(_db: DatabaseType, _username: string) {
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
    data.user_ = [];
    await initKeys();
    mocked_called_count = false;
    mocked_called_reset = false;
    mocked_locked = false;
  });

  afterEach(async (): Promise<void> => {
    resetKeys();
  });

  test('login returns token on valid credentials.', async (): Promise<void> => {
    mocked_locked = false;
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta: {} };

    const result = await login(username, password);

    expect(result).toBe(`token for ${id}`);
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(true);
  });

  test('login returns invalidCredentials on invalid password.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta: {} };
    mocked_locked = false;

    const result = await login(username, 'invalid');

    expect(result).toBe(invalidCredentials);
    expect(mocked_called_count).toBe(true);
    expect(mocked_called_reset).toBe(false);
  });

  test('login returns invalidCredentials on invalid username.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta: {} };
    mocked_locked = false;

    const result = await login('invalid', password);

    expect(result).toBe(invalidCredentials);
    expect(mocked_called_count).toBe(true);
    expect(mocked_called_reset).toBe(false);
  });

  test('login returns invalidCredentials on invalid credentials.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta: {} };
    mocked_locked = false;

    const result = await login('invalid', 'invalid');

    expect(result).toBe(invalidCredentials);
    expect(mocked_called_count).toBe(true);
    expect(mocked_called_reset).toBe(false);
  });

  test('login returns attemptsExceeded if locked.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta: {} };
    mocked_locked = true;

    const result = await login(username, password);

    expect(result).toBe(attemptsExceeded);
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });

  test('checkPassword returns empty string on valid credentials.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta: {} };

    const result = await checkPassword(username, password);

    expect(result).toBe('');
  });

  test('checkPassword returns invalidCredentials on invalid credentials.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta: {} };

    const result = await checkPassword(username, 'invalid');

    expect(result).toBe(invalidCredentials);
  });

  test('authorize returns user if logged in.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta: {} };
    const token = issueToken(`real_${id}`);

    const user = await authorize(token);

    expect(user?.username).toBe(username);
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });

  test('authorize returns null if logged-in user does not exist.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta: {} };
    const token = issueToken(`real_other`);

    const user = await authorize(token);

    expect(user).toBeNull();
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });

  test('authorize returns null if token is invalid.', async (): Promise<void> => {
    const token = issueToken(`real_${id}`);

    const user = await authorize(token.substring(0, token.length - 2));

    expect(user).toBeNull();
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });

  test('authorize returns null if token is empty.', async (): Promise<void> => {
    const user = await authorize('');

    expect(user).toBeNull();
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });

  test('authorize returns null if no token.', async (): Promise<void> => {
    const user = await authorize(null);

    expect(user).toBeNull();
    expect(mocked_called_count).toBe(false);
    expect(mocked_called_reset).toBe(false);
  });

  test('changePassword changes password.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion: '', salt: '', hash: '', id, admin: true, meta: {} };

    await changePassword(id, password);

    expect((data.user_[0] as User)?.hashVersion).toBe(current.version);
    expect((data.user_[0] as User)?.salt).toBe(salt);
    expect((data.user_[0] as User)?.hash).toBe(hash);
  });
});
