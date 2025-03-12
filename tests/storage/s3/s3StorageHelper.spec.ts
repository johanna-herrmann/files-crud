import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  S3ClientConfig,
  CreateBucketCommandInput,
  CreateBucketCommand,
  PutObjectCommandInput,
  GetObjectCommandInput
} from '@aws-sdk/client-s3';
import { MinioContainer, StartedMinioContainer } from '@testcontainers/minio';
import { getObjectBody, putObject, deleteObject, copyObject } from '@/storage/s3/s3StorageHelper';

const BUCKET_NAME = 'files-crud';
let s3Client: S3Client | null = null;

const createClient = function (container: StartedMinioContainer): S3Client {
  const config: S3ClientConfig = {
    region: 'local',
    endpoint: container.getConnectionUrl(),
    credentials: {
      accessKeyId: container.getUsername(),
      secretAccessKey: container.getPassword()
    },
    forcePathStyle: true
  };
  return new S3Client(config);
};

const createBucket = async function (): Promise<void> {
  const input: CreateBucketCommandInput = {
    Bucket: BUCKET_NAME
  };
  const command = new CreateBucketCommand(input);
  const client = s3Client ?? new S3Client();
  await client.send(command);
};

const createObject = async function (client: S3Client, Key: string, Body: Buffer): Promise<void> {
  const input: PutObjectCommandInput = {
    Bucket: BUCKET_NAME,
    Key,
    Body
  };
  const command = new PutObjectCommand(input);
  await client.send(command);
};

const getBodyFromObject = async function (client: S3Client, Key: string): Promise<Buffer> {
  const input: GetObjectCommandInput = {
    Bucket: BUCKET_NAME,
    Key
  };
  const command = new GetObjectCommand(input);
  const result = await client.send(command);
  const dataArray = await result.Body?.transformToByteArray();

  return Buffer.from(dataArray ?? new Uint8Array());
};

const objectExists = async function (client: S3Client, Key: string): Promise<boolean> {
  const input: GetObjectCommandInput = {
    Bucket: BUCKET_NAME,
    Key
  };
  const command = new GetObjectCommand(input);
  try {
    const result = await client.send(command);
    return !!result.Body;
  } catch (err: unknown) {
    if ((err as Error).name === 'NoSuchKey') {
      return false;
    }
    throw err as Error;
  }
};

describe('s3StorageHelper', (): void => {
  let container: null | StartedMinioContainer = null;

  beforeAll(async (): Promise<void> => {
    container = await new MinioContainer('minio/minio:RELEASE.2024-12-13T22-19-12Z').withAddedCapabilities().start();
    s3Client = createClient(container);
    await createBucket();
  });

  afterAll(async (): Promise<void> => {
    container?.stop();
  });

  test('getObjectBody returns object body', async (): Promise<void> => {
    const client = s3Client ?? new S3Client();
    await createObject(client, 'testKey', Buffer.from('content'));

    const result = await getObjectBody(client, BUCKET_NAME, 'testKey');

    expect(result).toEqual(Buffer.from('content'));
  });

  test('getObjectBody returns object body, with trimming', async (): Promise<void> => {
    const client = s3Client ?? new S3Client();
    await createObject(client, 'testKey', Buffer.from('content'));

    const result = await getObjectBody(client, BUCKET_NAME, 'testKey/');

    expect(result).toEqual(Buffer.from('content'));
  });

  test('putObject puts object correctly.', async (): Promise<void> => {
    const body = Buffer.from('content2');
    const client = s3Client ?? new S3Client();

    await putObject(client, BUCKET_NAME, 'testKeyB', body);

    expect(await getBodyFromObject(client, 'testKeyB')).toEqual(body);
  });

  test('putObject puts object correctly, with trimming.', async (): Promise<void> => {
    const body = Buffer.from('content3');
    const client = s3Client ?? new S3Client();

    await putObject(client, BUCKET_NAME, '/testKeyC/', body);

    expect(await getBodyFromObject(client, 'testKeyC')).toEqual(body);
  });

  test('deleteObject deletes object correctly.', async (): Promise<void> => {
    const client = s3Client ?? new S3Client();
    await createObject(client, 'test1', Buffer.from('content'));
    await createObject(client, 'test2/sub', Buffer.from('content2'));

    await deleteObject(client, BUCKET_NAME, 'test2/sub');

    expect(await objectExists(client, 'test1')).toBe(true);
    expect(await objectExists(client, 'test2/sub')).toBe(false);
    expect(await objectExists(client, 'test2')).toBe(false);
  });

  test('deleteObject deletes object correctly, with trimming.', async (): Promise<void> => {
    const client = s3Client ?? new S3Client();
    await createObject(client, 'test1B', Buffer.from('content'));
    await createObject(client, 'test2B/sub', Buffer.from('content2'));

    await deleteObject(client, BUCKET_NAME, '///test2B/sub//////');

    expect(await objectExists(client, 'test1B')).toBe(true);
    expect(await objectExists(client, 'test2B/sub')).toBe(false);
    expect(await objectExists(client, 'test2B')).toBe(false);
  });

  test('copyObject copies object correctly.', async (): Promise<void> => {
    const client = s3Client ?? new S3Client();
    await createObject(client, 'source', Buffer.from('source'));

    await copyObject(client, BUCKET_NAME, 'source', 'tar/get');

    expect(await objectExists(client, 'source')).toBe(true);
    expect(await objectExists(client, 'tar/get')).toBe(true);
    expect(await objectExists(client, 'tar')).toBe(false);
    expect(await getBodyFromObject(client, 'source')).toEqual(Buffer.from('source'));
    expect(await getBodyFromObject(client, 'tar/get')).toEqual(Buffer.from('source'));
  });

  test('copyObject copies object correctly, with trimming.', async (): Promise<void> => {
    const client = s3Client ?? new S3Client();
    await createObject(client, 'source2', Buffer.from('source'));

    await copyObject(client, BUCKET_NAME, '/source2', 'tar/get2/');

    expect(await objectExists(client, 'source2')).toBe(true);
    expect(await objectExists(client, 'tar/get2')).toBe(true);
    expect(await objectExists(client, 'tar')).toBe(false);
    expect(await getBodyFromObject(client, 'source2')).toEqual(Buffer.from('source'));
    expect(await getBodyFromObject(client, 'tar/get2')).toEqual(Buffer.from('source'));
  });
});
