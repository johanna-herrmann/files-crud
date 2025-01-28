import { Database } from './Database';

let db: Database | null;

const getDb = function (): Database {
  if (!!db) {
    return db;
  }

  return (db = new Database());
};

const loadDb = async function (): Promise<Database> {
  const database = getDb();
  await database.open();
  await database.init();
  return database;
};

const closeDb = async function (): Promise<void> {
  await db?.close();
};

const resetDb = function (): void {
  db = null;
};

const reloadDb = function (): void {
  const oldDb = db;
  db = new Database();
  oldDb?.close();
};

export { loadDb, closeDb, resetDb, reloadDb };
