import { loadDb, closeDb, resetDb } from '@/database';
import { loadConfig } from '@/config';
import { MemoryDatabaseAdapter } from '@/database/memdb/MemoryDatabaseAdapter';

describe('database', (): void => {
  afterEach(async (): Promise<void> => {
    await closeDb();
    resetDb();
  });

  test('loadDb loads memory-db correctly', async (): Promise<void> => {
    loadConfig();

    const db = await loadDb();

    expect(db.getAdapter()).toBeInstanceOf(MemoryDatabaseAdapter);
    expect((db.getAdapter() as MemoryDatabaseAdapter).isConnected()).toBe(true);
  });

  test('closeDb closes db correctly', async (): Promise<void> => {
    loadConfig();
    const db = await loadDb();

    await closeDb();

    expect(db.getAdapter()).toBeInstanceOf(MemoryDatabaseAdapter);
    expect((db.getAdapter() as MemoryDatabaseAdapter).isConnected()).toBe(false);
  });
});
