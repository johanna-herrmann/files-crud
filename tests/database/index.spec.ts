import { loadDb, closeDb, resetDb } from '@/database';
import { MemoryDatabase } from '@/database/memdb/MemoryDatabase';
import { MongoDatabase } from '@/database/mongodb/MongoDatabase';
import { PostgresDatabase } from '@/database/postgresql/PostgresDatabase';
import mongoose from 'mongoose';
import { DynamoDatabase } from '@/database/dynamodb/DynamoDatabase';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Client } from 'pg';
import PgDbConf from '@/types/PgDbConf';
import mockFS from 'mock-fs';
import { loadConfig } from '@/config';

interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}

interface MockedData {
  conf?: PgDbConf;
  client?: Client;
  connected?: boolean;
  definingQueries?: string[];
  writingQueries?: string[];
  values?: (string | number | boolean)[][];
}

const Mocked_Client = Client;
let mocked_data: MockedData = {};

jest.mock('@/database/postgresql/pgWrapper', () => {
  return {
    getNewClient(conf: PgDbConf) {
      const newClient = new Mocked_Client(conf);
      mocked_data.client = newClient;
      mocked_data.conf = conf;
      mocked_data.definingQueries = [];
      mocked_data.writingQueries = [];
      mocked_data.values = [];
      return newClient;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async connect(_: Client) {
      mocked_data.connected = true;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async end(_: Client) {
      mocked_data.connected = false;
    },
    async definingQuery(_: Client, query: string) {
      mocked_data.definingQueries?.push(query);
    }
  };
});

const expectDynamoDb = function (db: DynamoDatabase, key: string, secret: string) {
  expect(db).toBeInstanceOf(DynamoDatabase);
  expect(db.getConfig().region).toBe('eu-central-1');
  expect((db.getConfig().credentials as AwsCredentials)?.accessKeyId).toBe(key);
  expect((db.getConfig().credentials as AwsCredentials)?.secretAccessKey).toBe(secret);
  expect(db.getClient()).toBeInstanceOf(DynamoDBClient);
};

describe('db', (): void => {
  afterEach(async (): Promise<void> => {
    mockFS.restore();
    await closeDb();
    resetDb();
    mocked_data = {};
  });

  test('loadDb loads memory-db correctly', async (): Promise<void> => {
    mockFS({ './config.json': '{}' });
    loadConfig();

    const db = await loadDb();

    expect(db).toBeInstanceOf(MemoryDatabase);
  });

  test('loadDb loads mongodb correctly', async (): Promise<void> => {
    mockFS({ './config.json': '{"database":{"name":"mongodb"}}' });
    loadConfig();

    const db = (await loadDb()) as MongoDatabase;

    expect(db).toBeInstanceOf(MongoDatabase);
    expect(db.getConf()[0]).toBe('mongodb://localhost:27017');
    expect(mongoose.connection.readyState).toBe(1);
  });

  test('loadDb loads postgresql correctly', async (): Promise<void> => {
    mockFS({ './config.json': '{"database":{"name":"postgresql"}}' });
    loadConfig();

    const db = (await loadDb()) as PostgresDatabase;

    expect(db).toBeInstanceOf(PostgresDatabase);
    expect(db.getConf().port).toBe(5432);
    expect(mocked_data.client).toBeDefined();
    expect(mocked_data.connected).toBe(true);
  });

  test('loadDb loads dynamodb correctly, credentials given specifically.', async (): Promise<void> => {
    mockFS({
      './config.json':
        '{"database":{"name":"dynamodb", "accessKeyId":"key", "secretAccessKey":"secret"}, "accessKeyId":"test", "secretAccessKey":"test"}'
    });
    loadConfig();

    const db = (await loadDb()) as DynamoDatabase;

    expectDynamoDb(db, 'key', 'secret');
  });

  test('loadDb loads dynamodb correctly, credentials given globally.', async (): Promise<void> => {
    mockFS({ './config.json': '{"database":{"name":"dynamodb"}, "accessKeyId":"key", "secretAccessKey":"secret"}' });
    loadConfig();

    const db = (await loadDb()) as DynamoDatabase;

    expectDynamoDb(db, 'key', 'secret');
  });

  test('loadDb loads dynamodb correctly, no credentials given.', async (): Promise<void> => {
    mockFS({ './config.json': '{"database":{"name":"dynamodb"}}' });
    loadConfig();

    const db = (await loadDb()) as DynamoDatabase;

    expectDynamoDb(db, 'fallback-key', 'fallback-secret');
  });

  test('closeDb closes db correctly', async (): Promise<void> => {
    mockFS({ './config.json': '{"database":{"name":"postgresql"}}' });
    loadConfig();
    const db = (await loadDb()) as PostgresDatabase;

    await closeDb();

    expect(db).toBeInstanceOf(PostgresDatabase);
    expect(mocked_data.connected).toBe(false);
  });
});
