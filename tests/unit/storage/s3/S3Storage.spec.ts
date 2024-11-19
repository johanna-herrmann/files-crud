import { S3Storage } from '@/storage/s3/S3Storage';
import { S3Client } from '@aws-sdk/client-s3';

let mocked_s3: Record<string, Buffer | undefined> = {};

jest.mock('@/storage/s3/s3StorageHelper', () => {
  return {
    async getObjectBody(client: S3Client, Bucket: string, Key: string): Promise<Buffer> {
      return mocked_s3[`${Bucket}|${Key}`] ?? Buffer.from('');
    },
    async putObject(client: S3Client, Bucket: string, Key: string, directory: boolean, Body?: Buffer): Promise<void> {
      if (directory) {
        Key += '/';
      }
      mocked_s3[`${Bucket}|${Key}`] = Body ?? Buffer.from('');
    },
    async deleteObject(client: S3Client, Bucket: string, path: string, directory: boolean): Promise<void> {
      const Key = directory ? `${path}/` : path;
      delete mocked_s3[`${Bucket}|${Key}`];
    },
    async copyObject(client: S3Client, Bucket: string, copySource: string, key: string): Promise<void> {
      mocked_s3[`${Bucket}|${key}`] = mocked_s3[`${Bucket}|${copySource}`];
    }
  };
});

const wrapper = new S3Storage('de', 'accessId', 'secret', 'bucket');

describe('S3Storage', (): void => {
  afterEach(async (): Promise<void> => {
    mocked_s3 = {};
  });

  test('S3Storage->constructor creates client and sets bucket correctly, without endpoint.', async (): Promise<void> => {
    const newWrapper = new S3Storage('de', 'accessId', 'secret', 'bucket');

    const [client, bucket] = newWrapper.getConf();
    const credentials = await client.config.credentials();
    expect(await client.config.region()).toBe('de');
    expect(client.config.endpoint).toBeUndefined();
    expect(credentials.accessKeyId).toBe('accessId');
    expect(credentials.secretAccessKey).toBe('secret');
    expect(bucket).toBe('bucket');
  });

  test('S3Storage->constructor creates client and sets bucket correctly, with endpoint.', async (): Promise<void> => {
    const endpoint = 'https://testEndpoint.com/buckets/';

    const newWrapper = new S3Storage('de', 'accessId', 'secret', 'bucket', endpoint);

    const [client, bucket] = newWrapper.getConf();
    const credentials = await client.config.credentials();
    expect(await client.config.region()).toBe('de');
    expect(client.config.endpoint).toBeDefined();
    expect(client.config.endpoint && (await client.config.endpoint())).toEqual({
      hostname: 'testendpoint.com',
      path: '/buckets/',
      port: undefined,
      protocol: 'https:',
      query: undefined
    });
    expect(credentials.accessKeyId).toBe('accessId');
    expect(credentials.secretAccessKey).toBe('secret');
    expect(bucket).toBe('bucket');
  });

  test('S3Storage->writeFile creates object.', async (): Promise<void> => {
    await wrapper.writeFile('file', 'content', 'utf8');

    expect(mocked_s3['bucket|file']).toEqual(Buffer.from('content', 'utf8'));
  });

  test('S3Storage->readFile reads file.', async (): Promise<void> => {
    mocked_s3['bucket|file'] = Buffer.from('content', 'utf8');

    const content = await wrapper.readFile('file', 'utf8');

    expect(content).toBe('content');
  });

  test('S3Storage->unlink deletes object.', async (): Promise<void> => {
    mocked_s3['bucket|file'] = Buffer.from('');
    mocked_s3['bucket|file2'] = Buffer.from('');

    await wrapper.unlink('file');

    expect(mocked_s3['bucket|file']).toBeUndefined();
    expect(mocked_s3['bucket|file2']).toEqual(Buffer.from(''));
  });

  test('S3Storage->copyFile copies file.', async (): Promise<void> => {
    mocked_s3['bucket|file'] = Buffer.from('testContent', 'utf8');
    mocked_s3['bucket|other'] = Buffer.from('');

    await wrapper.copyFile('file', 'fileCopy');

    expect(mocked_s3['bucket|file']).toEqual(Buffer.from('testContent', 'utf8'));
    expect(mocked_s3['bucket|fileCopy']).toEqual(Buffer.from('testContent', 'utf8'));
  });
});
