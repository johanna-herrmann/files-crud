import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { putItem, updateItem, deleteItem, loadItem, loadItems, itemExists } from '@/database/dynamodb/dynamoDbHelper';
import { testUser } from '#/testItems';
import { User } from '@/types/user/User';

const dynamoMock = mockClient(DynamoDBClient);
const client = new DynamoDBClient();
const TableName = 'table-name';

const mockForLoad = function () {
  const item = { ...testUser };
  dynamoMock
    .on(QueryCommand, {
      TableName,
      ExpressionAttributeNames: { '#key': 'username' },
      ExpressionAttributeValues: { ':value': 'someName' },
      KeyConditionExpression: '#key = :value',
      Limit: 1
    })
    .resolves({
      Items: [item]
    });
};

const mockForExists = function (exists: boolean) {
  dynamoMock
    .on(QueryCommand, {
      TableName,
      ExpressionAttributeNames: { '#key': 'username' },
      ExpressionAttributeValues: { ':value': 'someName' },
      KeyConditionExpression: '#key = :value',
      Limit: 1,
      ProjectionExpression: 'username'
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

  test('putItem calls dynamodb api putCommand correctly.', async (): Promise<void> => {
    let called = false;
    dynamoMock.on(PutCommand, { TableName, Item: { ...testUser } }).callsFake(() => (called = true));

    await putItem(client, TableName, testUser);

    expect(called).toBe(true);
  });

  test('updateItem calls dynamodb api updateCommand correctly, string update.', async (): Promise<void> => {
    let called = false;
    dynamoMock
      .on(UpdateCommand, {
        TableName,
        Key: { username: testUser.username },
        ExpressionAttributeValues: { ':username': 'newUsername' },
        UpdateExpression: 'username = :username'
      })
      .callsFake(() => (called = true));

    await updateItem(client, TableName, 'username', testUser.username, { username: 'newUsername' });

    expect(called).toBe(true);
  });

  test('updateItem calls dynamodb api updateCommand correctly, object update.', async (): Promise<void> => {
    let called = false;
    dynamoMock
      .on(UpdateCommand, {
        TableName,
        Key: { username: testUser.username },
        ExpressionAttributeValues: { ':meta': { k: 'v' } },
        UpdateExpression: 'meta = :meta'
      })
      .callsFake(() => (called = true));

    await updateItem(client, TableName, 'username', testUser.username, { meta: { k: 'v' } });

    expect(called).toBe(true);
  });

  test('deleteItem calls dynamodb api deleteCommand correctly.', async (): Promise<void> => {
    let called = false;
    dynamoMock.on(DeleteCommand, { TableName, Key: { username: testUser.username } }).callsFake(() => (called = true));

    await deleteItem(client, TableName, 'username', testUser.username);

    expect(called).toBe(true);
  });

  test('loadItem loads Item correctly.', async (): Promise<void> => {
    mockForLoad();

    const userItem = await loadItem<User>(client, TableName, 'username', 'someName');

    expect(userItem).toEqual(testUser);
  });

  test('loadItems loads items correctly.', async (): Promise<void> => {
    dynamoMock.on(ScanCommand, { TableName }).resolves({ Items: [testUser, { ...testUser, username: 'other' }] });

    const items = await loadItems<User>(client, TableName);

    expect(items).toEqual([testUser, { ...testUser, username: 'other' }]);
  });

  test('exists returns true if item exists.', async (): Promise<void> => {
    mockForExists(true);

    const exists = await itemExists(client, TableName, 'username', 'someName');

    expect(exists).toBe(true);
  });

  test('exists returns false if item does not exist.', async (): Promise<void> => {
    mockForExists(false);

    const exists = await itemExists(client, TableName, 'username', 'someName');

    expect(exists).toBe(false);
  });
});
