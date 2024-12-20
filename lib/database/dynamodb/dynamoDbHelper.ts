import DbItem from '@/types/DbItem';
import { DynamoDBClient, ListTablesCommand, CreateTableCommand, CreateTableCommandInput } from '@aws-sdk/client-dynamodb';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildDbItem = function <T extends DbItem>(itemFound: Record<string, any> | undefined): T | null {
  if (!itemFound) {
    return null;
  }
  return itemFound as T;
};

const putItem = async function (client: DynamoDBClient, TableName: string, Item: DbItem): Promise<void> {
  const input: PutCommandInput = {
    TableName,
    Item
  };
  const command = new PutCommand(input);
  await client.send(command);
};

const listTables = async function (client: DynamoDBClient): Promise<string[]> {
  let ExclusiveStartTableName: string | undefined;
  let more = true;
  const tables: string[] = [];
  while (more) {
    const command = new ListTablesCommand(ExclusiveStartTableName ? { ExclusiveStartTableName } : {});
    const result = await client.send(command);
    tables.push(...(result.TableNames || []));
    ExclusiveStartTableName = result.LastEvaluatedTableName;
    more = !!ExclusiveStartTableName;
  }
  return tables;
};

const createTable = async function (client: DynamoDBClient, TableName: string, keyName: string): Promise<void> {
  const input: CreateTableCommandInput = {
    TableName,
    BillingMode: 'PAY_PER_REQUEST',
    TableClass: 'STANDARD',
    AttributeDefinitions: [{ AttributeName: keyName, AttributeType: 'S' }],
    KeySchema: [{ AttributeName: keyName, KeyType: 'HASH' }]
  };
  const command = new CreateTableCommand(input);
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
      [keyName]: keyValue
    }
  };
  const command = new DeleteCommand(input);
  await client.send(command);
};

const loadItem = async function <T extends DbItem>(client: DynamoDBClient, TableName: string, keyName: string, keyValue: string): Promise<T | null> {
  const input: QueryCommandInput = {
    TableName,
    ExpressionAttributeNames: {
      '#key': keyName
    },
    ExpressionAttributeValues: {
      ':value': keyValue
    },
    KeyConditionExpression: '#key = :value',
    Limit: 1
  };

  const command = new QueryCommand(input);
  const result = await client.send(command);

  return buildDbItem<T>(result.Items?.at(0));
};

const loadItems = async function <T extends DbItem>(client: DynamoDBClient, TableName: string): Promise<T[]> {
  const input: ScanCommandInput = { TableName };
  const command = new ScanCommand(input);
  const result = await client.send(command);
  const items = result.Items ?? [];
  return items as T[];
};

const itemExists = async function (client: DynamoDBClient, TableName: string, keyName: string, keyValue: string): Promise<boolean> {
  const input: QueryCommandInput = {
    TableName,
    ExpressionAttributeNames: {
      '#key': keyName
    },
    ExpressionAttributeValues: {
      ':value': keyValue
    },
    KeyConditionExpression: '#key = :value',
    Limit: 1,
    ProjectionExpression: ''
  };

  const command = new QueryCommand(input);
  const result = await client.send(command);

  return !!result.Items?.at(0);
};

export { listTables, createTable, putItem, updateItem, deleteItem, loadItem, loadItems, itemExists };
