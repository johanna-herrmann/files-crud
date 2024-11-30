import { countAttempt, handleLocking, resetAttempts, THRESHOLD, TTL_MIN, TTL_MAX } from '@/user/locking';
import { MemoryDatabase, tables } from '@/database/memdb/MemoryDatabase';

const username = 'testUser';

describe('locking', () => {
  beforeEach(async (): Promise<void> => {
    tables.failedLoginAttempts = {};
    jest.useFakeTimers();
  });

  afterEach(async (): Promise<void> => {
    jest.useRealTimers();
  });

  test('countAttempt counts attempt.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    tables.failedLoginAttempts.testUser = { username, attempts: 1, lastAttempt: 0 };
    jest.setSystemTime(new Date(42));

    await countAttempt(db, username);

    expect(tables.failedLoginAttempts.testUser?.attempts).toBe(2);
    expect(tables.failedLoginAttempts.testUser?.lastAttempt).toBe(42);
  });

  test('resetAttempts resets attempts.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    tables.failedLoginAttempts.testUser = { username, attempts: 1, lastAttempt: 0 };
    jest.setSystemTime(new Date(42));

    await resetAttempts(db, username);

    expect(tables.failedLoginAttempts.testUser).toBeUndefined();
  });

  test('handleLocking returns false, if attempts < threshold.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    tables.failedLoginAttempts.testUser = { username, attempts: 1, lastAttempt: 0 };
    jest.setSystemTime(new Date(42));

    const locked = await handleLocking(db, username);

    expect(locked).toBe(false);
  });

  test('handleLocking returns false, if lock is expired, smallest TTL.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    tables.failedLoginAttempts.testUser = { username, attempts: 5, lastAttempt: 0 };
    jest.setSystemTime(new Date(TTL_MIN + 1));

    const locked = await handleLocking(db, username);

    expect(locked).toBe(false);
  });

  test('handleLocking returns true, if lock is active, also updates lastAttempt, smallest TTL.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    tables.failedLoginAttempts.testUser = { username, attempts: 5, lastAttempt: 0 };
    jest.setSystemTime(new Date(TTL_MIN - 500));

    const locked = await handleLocking(db, username);

    expect(locked).toBe(true);
    expect(tables.failedLoginAttempts.testUser.lastAttempt).toBe(TTL_MIN - 500);
  });

  test('handleLocking returns false, if lock is expired, medium TTL.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    tables.failedLoginAttempts.testUser = { username, attempts: 8, lastAttempt: 0 };
    const factor = 2 ** (8 - THRESHOLD);
    const ttl = TTL_MIN * factor;
    jest.setSystemTime(new Date(ttl + 1));

    const locked = await handleLocking(db, username);

    expect(locked).toBe(false);
  });

  test('handleLocking returns true, if lock is active, also updates lastAttempt, medium TTL.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    tables.failedLoginAttempts.testUser = { username, attempts: 8, lastAttempt: 0 };
    const factor = 2 ** (8 - THRESHOLD);
    const ttl = TTL_MIN * factor;
    jest.setSystemTime(new Date(ttl - 500));

    const locked = await handleLocking(db, username);

    expect(locked).toBe(true);
    expect(tables.failedLoginAttempts.testUser.lastAttempt).toBe(ttl - 500);
  });

  test('handleLocking returns false, if lock is expired, biggest TTL.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    tables.failedLoginAttempts.testUser = { username, attempts: 12, lastAttempt: 0 };
    jest.setSystemTime(new Date(TTL_MAX + 1));

    const locked = await handleLocking(db, username);

    expect(locked).toBe(false);
  });

  test('handleLocking returns true, if lock is active, also updates lastAttempt, biggest TTL.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    tables.failedLoginAttempts.testUser = { username, attempts: 12, lastAttempt: 0 };
    jest.setSystemTime(new Date(TTL_MAX - 500));

    const locked = await handleLocking(db, username);

    expect(locked).toBe(true);
    expect(tables.failedLoginAttempts.testUser.lastAttempt).toBe(TTL_MAX - 500);
  });
});
