import { loadDb, resetDb } from '@/database';
import { loadConfig } from '@/config/config';
import { data, MemoryDatabaseAdapter } from '@/database/memdb/MemoryDatabaseAdapter';

describe('database', (): void => {
  afterEach(async (): Promise<void> => {
    await (await loadDb()).close();
    resetDb();
  });

  test('loadDB inits new memory-db correctly', async (): Promise<void> => {
    loadConfig();

    const db = await loadDb();

    expect(db.getAdapter()).toBeInstanceOf(MemoryDatabaseAdapter);
    expect((db.getAdapter() as MemoryDatabaseAdapter).isConnected()).toBe(true);
    expect(data.user_).toEqual([]);
    expect(data.jwtKey).toEqual([]);
    expect(data.failedLoginAttempts).toEqual([]);
  });

  test('loadDb loads given memory-db correctly', async (): Promise<void> => {
    loadConfig();
    const db = await loadDb();
    await db.close();

    const loadedDb = await loadDb();

    expect((loadedDb.getAdapter() as MemoryDatabaseAdapter).isConnected()).toBe(false);
    expect(loadedDb).toBe(db);
  });
});
