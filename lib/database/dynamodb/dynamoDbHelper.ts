import DbItem from '@/types/DbItem';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  PutCommand,
  PutCommandInput,
  UpdateCommand,
  UpdateCommandInput,
  DeleteCommand,
  DeleteCommandInput,
  QueryCommand,
  QueryCommandInput,
  ScanCommand,
  ScanCommandInput,
  NativeAttributeValue
} from '@aws-sdk/lib-dynamodb';
import { v4 } from 'uuid';

type DbItemWithKeyAttributes = DbItem & { all: 'all'; id?: string };
const all = 'all';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildDbItem = function <T extends DbItem>(itemFound: Record<string, any> | undefined): T | null {
  if (!itemFound) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, all, ...item } = itemFound;
  return item as T;
};

const putItem = async function (client: DynamoDBClient, TableName: string, item: DbItem, withId?: boolean): Promise<void> {
  const Item: DbItemWithKeyAttributes = { ...item, all };
  if (withId) {
    Item.id = v4();
  }

  const input: PutCommandInput = {
    TableName,
    Item
  };
  const command = new PutCommand(input);
  await client.send(command);
};

const updateItem = async function (
  client: DynamoDBClient,
  TableName: string,
  keyName: string,
  keyValue: string,
  update: Record<string, NativeAttributeValue>
): Promise<void> {
  const ExpressionAttributeValues: Record<string, NativeAttributeValue> = {};
  const updates: string[] = [];
  for (const [key, value] of Object.entries(update)) {
    ExpressionAttributeValues[`:${key}`] = value;
    updates.push(`${key} = :${key}`);
  }
  const input: UpdateCommandInput = {
    TableName,
    Key: {
      all,
      [keyName]: keyValue
    },
    ExpressionAttributeValues,
    UpdateExpression: updates.join(', ')
  };
  const command = new UpdateCommand(input);
  await client.send(command);
};

const deleteItem = async function (client: DynamoDBClient, TableName: string, keyName: string, keyValue: string): Promise<void> {
  const input: DeleteCommandInput = {
    TableName,
    Key: {
      all,
      [keyName]: keyValue
    }
  };
  const command = new DeleteCommand(input);
  await client.send(command);
};

const loadItem = async function <T extends DbItem>(
  client: DynamoDBClient,
  TableName: string,
  keyName: string,
  keyValue: string,
  IndexName?: string
): Promise<T | null> {
  const input: QueryCommandInput = {
    TableName,
    IndexName,
    ExpressionAttributeNames: {
      '#key': keyName
    },
    ExpressionAttributeValues: {
      ':value': keyValue
    },
    KeyConditionExpression: 'all = all and #key = :value',
    Limit: 1
  };

  const command = new QueryCommand(input);
  const result = await client.send(command);

  return buildDbItem<T>(result.Items?.at(0));
};

const loadId = async function (client: DynamoDBClient, TableName: string, keyName: string, keyValue: string, IndexName: string): Promise<string> {
  const input: QueryCommandInput = {
    TableName,
    IndexName,
    ExpressionAttributeNames: {
      '#key': keyName
    },
    ExpressionAttributeValues: {
      ':value': keyValue
    },
    KeyConditionExpression: 'all = all and #key = :value',
    Limit: 1,
    ProjectionExpression: 'id'
  };

  const command = new QueryCommand(input);
  const result = await client.send(command);
  const item = result.Items?.at(0);
  const index = IndexName ? IndexName : 'primary';

  if (!item) {
    throw new Error(`There was no such item in table ${TableName} for index ${index} and key ${keyName}=${keyValue}`);
  }

  if (!('id' in item)) {
    throw new Error(
      `The item in table ${TableName} for index ${index} and key ${keyName}=${keyValue} has no id property. Properties: ${Object.keys(item)}`
    );
  }

  return item.id;
};

const loadFiles = async function (client: DynamoDBClient, TableName: string, folder: string): Promise<string[]> {
  const input: QueryCommandInput = {
    TableName,
    IndexName: 'file-index',
    ExpressionAttributeValues: {
      ':folder': folder
    },
    KeyConditionExpression: 'all = all and folder = :folder',
    ProjectionExpression: 'file'
  };
  const command = new QueryCommand(input);
  const result = await client.send(command);
  const items = result.Items ?? [];
  return items.map((item) => item.file);
};

const loadJwtKeys = async function (client: DynamoDBClient, TableName: string): Promise<string[]> {
  const input: ScanCommandInput = {
    TableName
  };
  const command = new ScanCommand(input);
  const result = await client.send(command);
  const items = result.Items ?? [];
  return items.map((item) => item.key);
};

const itemExists = async function (
  client: DynamoDBClient,
  TableName: string,
  keyName: string,
  keyValue: string,
  IndexName?: string
): Promise<boolean> {
  const input: QueryCommandInput = {
    TableName,
    IndexName,
    ExpressionAttributeNames: {
      '#key': keyName
    },
    ExpressionAttributeValues: {
      ':value': keyValue
    },
    KeyConditionExpression: 'all = all and #key = :value',
    Limit: 1,
    ProjectionExpression: ''
  };

  const command = new QueryCommand(input);
  const result = await client.send(command);

  return !!result.Items?.at(0);
};

export { putItem, updateItem, deleteItem, loadItem, loadId, loadFiles, loadJwtKeys, itemExists };
