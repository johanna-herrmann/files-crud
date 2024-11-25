import { putItem, updateItem, deleteItem, loadItem, loadId, loadFiles, loadJwtKeys, itemExists } from '@/database/dynamodb/dynamoDbHelper';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import User from '@/types/User';

const dynamoMock = mockClient(DynamoDBClient);
const client = new DynamoDBClient();
const TableName = 'table-name';

const testUser = {
  username: 'testUser',
  hashVersion: 'v1',
  salt: 'testSalt',
  hash: 'testHash',
  admin: false,
  ownerId: 'testSectionId',
  meta: { testProp: 'testValue' }
};

const all = 'all';
const id = 'test-id';

const mockForLoad = function (withId: boolean, IndexName?: string) {
  const item = withId ? { ...testUser, all, id } : { ...testUser, all };
  dynamoMock
    .on(QueryCommand, {
      TableName,
      ExpressionAttributeNames: { '#key': 'username' },
      ExpressionAttributeValues: { ':value': 'someName' },
      KeyConditionExpression: 'all = all and #key = :value',
      Limit: 1,
      IndexName
    })
    .resolves({
      Items: [item]
    });
};

const mockForExists = function (exists: boolean, IndexName?: string) {
  dynamoMock
    .on(QueryCommand, {
      TableName,
      ExpressionAttributeNames: { '#key': 'username' },
      ExpressionAttributeValues: { ':value': 'someName' },
      KeyConditionExpression: 'all = all and #key = :value',
      Limit: 1,
      ProjectionExpression: '',
      IndexName
    })
    .resolves({
      Items: exists ? [{}] : []
    });
};

jest.mock('uuid', () => {
  const actual = jest.requireActual('uuid');
  return {
    ...actual,
    v4() {
      return 'test-id';
    }
  };
});

describe('dynamoDbHelper', (): void => {
  beforeEach(async (): Promise<void> => {
    dynamoMock.reset();
  });

  test('putItem calls dynamodb api putCommand correctly, with key.', async (): Promise<void> => {
    let called = false;
    dynamoMock.on(PutCommand, { TableName, Item: { ...testUser, id, all } }).callsFake(() => (called = true));

    await putItem(client, TableName, testUser, true);

    expect(called).toBe(true);
  });

  test('putItem calls dynamodb api putCommand correctly, without key.', async (): Promise<void> => {
    let called = false;
    dynamoMock.on(PutCommand, { TableName, Item: { ...testUser } }).callsFake(() => (called = true));

    await putItem(client, TableName, testUser, true);

    expect(called).toBe(true);
  });

  test('updateItem calls dynamodb api updateCommand correctly, string update.', async (): Promise<void> => {
    let called = false;
    dynamoMock
      .on(UpdateCommand, {
        TableName,
        Key: { all, id },
        ExpressionAttributeValues: { ':username': 'newUsername' },
        UpdateExpression: 'username = :username'
      })
      .callsFake(() => (called = true));

    await updateItem(client, TableName, 'id', id, { username: 'newUsername' });

    expect(called).toBe(true);
  });

  test('updateItem calls dynamodb api updateCommand correctly, object update.', async (): Promise<void> => {
    let called = false;
    dynamoMock
      .on(UpdateCommand, {
        TableName,
        Key: { id, all },
        ExpressionAttributeValues: { ':meta': { k: 'v' } },
        UpdateExpression: 'meta = :meta'
      })
      .callsFake(() => (called = true));

    await updateItem(client, TableName, 'id', id, { meta: { k: 'v' } });

    expect(called).toBe(true);
  });

  test('deleteItem calls dynamodb api deleteCommand correctly.', async (): Promise<void> => {
    let called = false;
    dynamoMock.on(DeleteCommand, { TableName, Key: { id, all } }).callsFake(() => (called = true));

    await deleteItem(client, TableName, 'id', id);

    expect(called).toBe(true);
  });

  test('loadItem loads Item correctly, no id, no index.', async (): Promise<void> => {
    mockForLoad(false);

    const userItem = await loadItem<User>(client, TableName, 'username', 'someName');

    expect(userItem).toEqual(testUser);
  });

  test('loadItem loads Item correctly, no id, with index.', async (): Promise<void> => {
    mockForLoad(false, 'index');

    const userItem = await loadItem<User>(client, TableName, 'username', 'someName', 'index');

    expect(userItem).toEqual(testUser);
  });

  test('loadItem loads Item correctly, with id, no index.', async (): Promise<void> => {
    mockForLoad(true);

    const userItem = await loadItem<User>(client, TableName, 'username', 'someName');

    expect(userItem).toEqual(testUser);
  });

  test('loadItem loads Item correctly, with id, with index.', async (): Promise<void> => {
    mockForLoad(true, 'index');

    const userItem = await loadItem<User>(client, TableName, 'username', 'someName', 'index');

    expect(userItem).toEqual(testUser);
  });

  test('loadId gets id correctly.', async (): Promise<void> => {
    dynamoMock
      .on(QueryCommand, {
        TableName,
        ExpressionAttributeNames: { '#key': 'folder' },
        ExpressionAttributeValues: { ':value': 'somePath' },
        KeyConditionExpression: 'all = all and #key = :value',
        IndexName: 'index',
        ProjectionExpression: 'id'
      })
      .resolves({
        Items: [{ all, id, folder: 'somePath' }]
      });

    const idReturned = await loadId(client, TableName, 'folder', 'somePath', 'index');

    expect(idReturned).toBe(id);
  });

  test('loadFiles loads files correctly.', async (): Promise<void> => {
    dynamoMock
      .on(QueryCommand, {
        TableName,
        ExpressionAttributeValues: { ':folder': 'somePath' },
        KeyConditionExpression: 'all = all and folder = :folder',
        IndexName: 'file-index',
        ProjectionExpression: 'file'
      })
      .resolves({
        Items: [
          { all, folder: 'somePath', file: 'file1' },
          { all, folder: 'somePath', file: 'file2' }
        ]
      });

    const files = await loadFiles(client, TableName, 'somePath');

    expect(files).toEqual(['file1', 'file2']);
  });

  test('loadAllKeys loads keys correctly.', async (): Promise<void> => {
    dynamoMock.on(ScanCommand, { TableName }).resolves({
      Items: [
        { all, key: 'key1' },
        { all, key: 'key2' }
      ]
    });

    const keys = await loadJwtKeys(client, TableName);

    expect(keys).toEqual(['key1', 'key2']);
  });

  test('exists returns true if item exists, no index.', async (): Promise<void> => {
    mockForExists(true);

    const exists = await itemExists(client, TableName, 'username', 'someName');

    expect(exists).toBe(true);
  });

  test('exists returns false if item does not exist, no index.', async (): Promise<void> => {
    mockForExists(false);

    const exists = await itemExists(client, TableName, 'username', 'someName');

    expect(exists).toBe(false);
  });

  test('exists returns true if item exists, with index.', async (): Promise<void> => {
    mockForExists(true, 'username-index');

    const exists = await itemExists(client, TableName, 'username', 'someName', 'username-index');

    expect(exists).toBe(true);
  });

  test('exists returns false if item does not exist, with index.', async (): Promise<void> => {
    mockForExists(false, 'username-index');

    const exists = await itemExists(client, TableName, 'username', 'someName', 'username-index');

    expect(exists).toBe(false);
  });
});
