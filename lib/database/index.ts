import Database from '@/types/Database';
import { getConfig } from '@/config';
import { MemoryDatabase } from './memdb/MemoryDatabase';
import { MongoDatabase } from './mongodb/MongoDatabase';
import { PostgresDatabase } from './postgresql/PostgresDatabase';
import { DynamoDatabase } from './dynamodb/DynamoDatabase';

let db: Database | null;

const getDb = function (): Database {
  const config = getConfig();
  if (!!db) {
    return db;
  }

  if (!config.database || config.database.name === 'in-memory') {
    return (db = new MemoryDatabase());
  }
  if (config.database.name === 'mongodb') {
    const url = config.database.url || 'mongodb://localhost:27017';
    const { user, pass } = config.database;
    return (db = new MongoDatabase(url, user, pass));
  }
  if (config.database.name === 'postgresql') {
    const host = config.database.host || 'localhost';
    const port = config.database.port || 5432;
    const database = config.database.db || 'files-crud';
    const { user, pass } = config.database;
    return (db = new PostgresDatabase({ host, port, database, user, password: pass }));
  }

  const region = config.database.region || 'eu-central-1';
  const accessKeyId = config.database.accessKeyId || config.accessKeyId || 'fallback-key';
  const secretAccessKey = config.database.secretAccessKey || config.secretAccessKey || 'fallback-secret';
  const userTableName = config.database.userTableName || 'files-crud-user';
  const jwtKeyTableName = config.database.userTableName || 'files-crud-jwtkey';
  const failedLoginAttemptsTableName = config.database.userTableName || 'files-crud-failedloginattempts';
  const fileTableName = config.database.userTableName || 'files-crud-file';
  return (db = new DynamoDatabase(region, accessKeyId, secretAccessKey, userTableName, jwtKeyTableName, failedLoginAttemptsTableName, fileTableName));
};

const loadDb = async function (): Promise<Database> {
  const database = getDb();
  await database.open();
  return database;
};

const closeDb = async function (): Promise<void> {
  await db?.close();
};

const resetDb = function (): void {
  db = null;
};

export { loadDb, closeDb, resetDb };
