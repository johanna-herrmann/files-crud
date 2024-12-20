import { countAttempt, handleLocking, resetAttempts, THRESHOLD, TTL_MIN, TTL_MAX } from '@/user/locking';
import { Database } from '@/database/Database';
import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import { testUser } from '#/testItems';

const username = 'testUser';

describe('locking', () => {
  beforeEach(async (): Promise<void> => {
    data.failedLoginAttempts = [];
    jest.useFakeTimers();
  });

  afterEach(async (): Promise<void> => {
    jest.useRealTimers();
  });

  test('countAttempt counts attempt.', async (): Promise<void> => {
    const db = new Database();
    data.failedLoginAttempts[0] = { username, attempts: 1, lastAttempt: 0 };
    jest.setSystemTime(new Date(42));

    await countAttempt(db, username);

    expect(data.failedLoginAttempts[0]?.username).toBe(testUser.username);
    expect(data.failedLoginAttempts[0]?.attempts).toBe(2);
    expect(data.failedLoginAttempts[0]?.lastAttempt).toBe(42);
  });

  test('resetAttempts resets attempts.', async (): Promise<void> => {
    const db = new Database();
    data.failedLoginAttempts[0] = { username, attempts: 1, lastAttempt: 0 };
    jest.setSystemTime(new Date(42));

    await resetAttempts(db, username);

    expect(data.failedLoginAttempts.length).toBe(0);
  });

  test('handleLocking returns false, if attempts < threshold.', async (): Promise<void> => {
    const db = new Database();
    data.failedLoginAttempts[0] = { username, attempts: 1, lastAttempt: 0 };
    jest.setSystemTime(new Date(42));

    const locked = await handleLocking(db, username);

    expect(locked).toBe(false);
  });

  test('handleLocking returns false, if lock is expired, smallest TTL.', async (): Promise<void> => {
    const db = new Database();
    data.failedLoginAttempts[0] = { username, attempts: 5, lastAttempt: 0 };
    jest.setSystemTime(new Date(TTL_MIN + 1));

    const locked = await handleLocking(db, username);

    expect(locked).toBe(false);
  });

  test('handleLocking returns true, if lock is active, also updates lastAttempt, smallest TTL.', async (): Promise<void> => {
    const db = new Database();
    data.failedLoginAttempts[0] = { username, attempts: 5, lastAttempt: 0 };
    jest.setSystemTime(new Date(TTL_MIN - 500));

    const locked = await handleLocking(db, username);

    expect(locked).toBe(true);
    expect(data.failedLoginAttempts[0]?.lastAttempt).toBe(TTL_MIN - 500);
  });

  test('handleLocking returns false, if lock is expired, medium TTL.', async (): Promise<void> => {
    const db = new Database();
    data.failedLoginAttempts[0] = { username, attempts: 8, lastAttempt: 0 };
    const factor = 2 ** (8 - THRESHOLD);
    const ttl = TTL_MIN * factor;
    jest.setSystemTime(new Date(ttl + 1));

    const locked = await handleLocking(db, username);

    expect(locked).toBe(false);
  });

  test('handleLocking returns true, if lock is active, also updates lastAttempt, medium TTL.', async (): Promise<void> => {
    const db = new Database();
    data.failedLoginAttempts[0] = { username, attempts: 8, lastAttempt: 0 };
    const factor = 2 ** (8 - THRESHOLD);
    const ttl = TTL_MIN * factor;
    jest.setSystemTime(new Date(ttl - 500));

    const locked = await handleLocking(db, username);

    expect(locked).toBe(true);
    expect(data.failedLoginAttempts[0]?.lastAttempt).toBe(ttl - 500);
  });

  test('handleLocking returns false, if lock is expired, biggest TTL.', async (): Promise<void> => {
    const db = new Database();
    data.failedLoginAttempts[0] = { username, attempts: 12, lastAttempt: 0 };
    jest.setSystemTime(new Date(TTL_MAX + 1));

    const locked = await handleLocking(db, username);

    expect(locked).toBe(false);
  });

  test('handleLocking returns true, if lock is active, also updates lastAttempt, biggest TTL.', async (): Promise<void> => {
    const db = new Database();
    data.failedLoginAttempts[0] = { username, attempts: 12, lastAttempt: 0 };
    jest.setSystemTime(new Date(TTL_MAX - 500));

    const locked = await handleLocking(db, username);

    expect(locked).toBe(true);
    expect(data.failedLoginAttempts[0]?.lastAttempt).toBe(TTL_MAX - 500);
  });
});
