import { getObjectBody, putObject, deleteObject, copyObject } from '@/storage/s3/s3StorageHelper';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, GetObjectCommand, GetObjectCommandOutput, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';

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

    await putObject(client, bucket, 'testKey', body);

    expect(called).toBe(true);
  });

  test('deleteObject calls deleteObjectCommand correctly.', async (): Promise<void> => {
    let called = false;
    s3Mock.on(DeleteObjectCommand, { Bucket: bucket, Key: 'testFile' }).callsFake(() => (called = true));

    await deleteObject(client, bucket, 'testFile');

    expect(called).toBe(true);
  });

  test('copyObject calls copyObjectCommand correctly.', async (): Promise<void> => {
    let called = false;
    s3Mock.on(CopyObjectCommand, { Bucket: bucket, Key: 'itemCopy', CopySource: 'item' }).callsFake(() => (called = true));

    await copyObject(client, bucket, 'item', 'itemCopy');

    expect(called).toBe(true);
  });
});
