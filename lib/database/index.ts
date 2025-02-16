import { Database } from './Database';

let db: Database | null;

const initDb = async function (): Promise<Database> {
  db = new Database();
  await db.open();
  await db.init();
  return db;
};

const loadDb = async function (): Promise<Database> {
  return db ?? (await initDb());
};

const resetDb = function (): void {
  db?.close();
  db = null;
};

const reloadDb = async function (): Promise<void> {
  const oldDb = db;
  await initDb();
  oldDb?.close();
};

export { loadDb, resetDb, reloadDb };
