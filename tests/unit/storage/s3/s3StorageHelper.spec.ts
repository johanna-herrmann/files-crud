import { getObjectBody, putObject, deleteObject, exists, listObjects } from '@/storage/s3/s3StorageHelper';
import { mockClient } from 'aws-sdk-client-mock';
import {
  S3Client,
  GetObjectCommand,
  GetObjectCommandOutput,
  GetObjectAttributesCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsCommand
} from '@aws-sdk/client-s3';

const s3Mock = mockClient(S3Client);
const client = new S3Client();
const bucket = 'test-bucket';

const mockGetObjectCommandOutput = function (input: string): GetObjectCommandOutput {
  return {
    Body: {
      size: 0,
      type: '',
      async transformToByteArray() {
        return new Uint8Array(Buffer.from(input));
      }
    }
  } as GetObjectCommandOutput;
};

describe('s3StorageHelper', (): void => {
  beforeEach(async (): Promise<void> => {
    s3Mock.reset();
  });

  test('getObjectBody returns object body', async (): Promise<void> => {
    s3Mock.on(GetObjectCommand, { Bucket: bucket, Key: 'testKey' }).resolves(mockGetObjectCommandOutput('content'));

    const result = await getObjectBody(client, bucket, 'testKey');

    expect(result).toEqual(Buffer.from('content'));
  });

  test('putObject calls putObjectCommand correctly.', async (): Promise<void> => {
    const body = Buffer.from('content');
    let called = false;
    s3Mock.on(PutObjectCommand, { Bucket: bucket, Key: 'testKey', Body: body }).callsFake(() => (called = true));

    await putObject(client, bucket, 'testKey', false, body);

    expect(called).toBe(true);
  });

  test('deleteObject calls deleteObjectCommand correctly.', async (): Promise<void> => {
    let called = false;
    s3Mock.on(DeleteObjectCommand, { Bucket: bucket, Key: 'testFile' }).callsFake(() => (called = true));

    await deleteObject(client, bucket, 'testFile', false);

    expect(called).toBe(true);
  });

  test('listObjects returns correct object key list.', async (): Promise<void> => {
    s3Mock.on(ListObjectsCommand, { Bucket: bucket, Prefix: 'test' }).resolves({
      Contents: [{ Key: 'test~1' }, { Key: 'test~2' }]
    });

    const items = await listObjects(client, bucket, 'test');

    expect(items).toEqual(['test~1', 'test~2']);
  });

  test('listObjects returns correct object key list, retrieved in two parts, with NextMarker.', async (): Promise<void> => {
    s3Mock.on(ListObjectsCommand, { Bucket: bucket, Prefix: 'test' }).resolves({
      Contents: [{ Key: 'test~1' }, { Key: 'test~2' }],
      IsTruncated: true,
      NextMarker: 'test~2'
    });
    s3Mock.on(ListObjectsCommand, { Bucket: bucket, Prefix: 'test', Marker: 'test~2' }).resolves({
      Contents: [{ Key: 'test~3' }, { Key: 'test~4' }]
    });

    const items = await listObjects(client, bucket, 'test');

    expect(items).toEqual(['test~1', 'test~2', 'test~3', 'test~4']);
  });

  test('listObjects returns correct object key list, retrieved in two parts, without NextMarker.', async (): Promise<void> => {
    s3Mock.on(ListObjectsCommand, { Bucket: bucket, Prefix: 'test' }).resolves({
      Contents: [{ Key: 'test~1' }, { Key: 'test~2' }],
      IsTruncated: true
    });
    s3Mock.on(ListObjectsCommand, { Bucket: bucket, Prefix: 'test', Marker: 'test~2' }).resolves({
      Contents: [{ Key: 'test~3' }, { Key: 'test~4' }]
    });

    const items = await listObjects(client, bucket, 'test');

    expect(items).toEqual(['test~1', 'test~2', 'test~3', 'test~4']);
  });

  test('exists returns true if item exists.', async (): Promise<void> => {
    s3Mock.on(GetObjectAttributesCommand, { Bucket: bucket, Key: 'item', ObjectAttributes: ['ObjectSize'] }).resolves(mockGetObjectCommandOutput(''));

    const result = await exists(client, bucket, 'item');

    expect(result).toBe(true);
  });

  test('exists returns false if item does not exist.', async (): Promise<void> => {
    const error = { Code: 'NoSuchKey' };
    s3Mock.on(GetObjectAttributesCommand, { Bucket: bucket, Key: 'item', ObjectAttributes: ['ObjectSize'] }).resolves(mockGetObjectCommandOutput(''));
    s3Mock.on(GetObjectAttributesCommand, { Bucket: bucket, Key: 'nope', ObjectAttributes: ['ObjectSize'] }).rejects(error);

    const result = await exists(client, bucket, 'nope');

    expect(result).toBe(false);
  });
});
