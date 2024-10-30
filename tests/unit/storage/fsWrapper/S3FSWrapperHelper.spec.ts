import { getObjectBody, putObject, deleteObject, exists } from '@/storage/fsWrapper/S3FSWrapperHelper';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, GetObjectCommand, GetObjectCommandOutput, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

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

const mockEmptyGetObjectCommandOutput = function (): GetObjectCommandOutput {
  return {} as GetObjectCommandOutput;
};

describe('S3FSWrapperHelper', (): void => {
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

  test('exists returns true if item exists.', async (): Promise<void> => {
    s3Mock.on(GetObjectCommand, { Bucket: bucket, Key: 'item' }).resolves(mockGetObjectCommandOutput(''));

    const result = await exists(client, bucket, 'item');

    expect(result).toBe(true);
  });

  test('exists returns false if item does not exist.', async (): Promise<void> => {
    s3Mock.on(GetObjectCommand, { Bucket: bucket, Key: 'item' }).resolves(mockGetObjectCommandOutput(''));
    s3Mock.on(GetObjectCommand, { Bucket: bucket, Key: 'nope' }).resolves(mockEmptyGetObjectCommandOutput());

    const result = await exists(client, bucket, 'nope');

    expect(result).toBe(false);
  });
});
