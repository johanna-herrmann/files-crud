import { S3StorageAdapter } from '@/storage/s3/S3StorageAdapter';
import { S3Client } from '@aws-sdk/client-s3';
import { loadConfig } from '@/config';

let mocked_s3: Record<string, Buffer | undefined> = {};

jest.mock('@/storage/s3/s3StorageHelper', () => {
  // noinspection JSUnusedGlobalSymbols - used outside
  return {
    async getObjectBody(_client: S3Client, Bucket: string, Key: string): Promise<Buffer> {
      return mocked_s3[`${Bucket}|${Key}`] ?? Buffer.from('');
    },
    async putObject(_client: S3Client, Bucket: string, Key: string, Body: Buffer): Promise<void> {
      mocked_s3[`${Bucket}|${Key}`] = Body;
    },
    async deleteObject(_client: S3Client, Bucket: string, path: string, directory: boolean): Promise<void> {
      const Key = directory ? `${path}/` : path;
      delete mocked_s3[`${Bucket}|${Key}`];
    },
    async copyObject(_client: S3Client, Bucket: string, copySource: string, key: string): Promise<void> {
      mocked_s3[`${Bucket}|${key}`] = mocked_s3[`${Bucket}|${copySource}`];
    }
  };
});

describe('S3Storage', (): void => {
  beforeEach(async (): Promise<void> => {
    loadConfig();
  });

  afterEach(async (): Promise<void> => {
    mocked_s3 = {};
  });

  test('S3StorageAdapter->constructor creates client and sets bucket correctly, without endpoint.', async (): Promise<void> => {
    const storage = new S3StorageAdapter();

    const [client, bucket] = storage.getConf();
    const credentials = await client.config.credentials();
    expect(await client.config.region()).toBe('eu-central-1');
    expect(client.config.endpoint).toBeUndefined();
    expect(credentials.accessKeyId).toBe('fallback-key');
    expect(credentials.secretAccessKey).toBe('fallback-secret');
    expect(bucket).toBe('files-crud');
  });

  test('S3StorageAdapter->constructor creates client and sets bucket correctly, with endpoint.', async (): Promise<void> => {
    const endpoint = 'https://testEndpoint.com/buckets/';
    loadConfig({ storage: { name: 's3', endpoint } });
    const storage = new S3StorageAdapter();

    const [client, bucket] = storage.getConf();
    const credentials = await client.config.credentials();
    expect(await client.config.region()).toBe('eu-central-1');
    expect(client.config.endpoint).toBeDefined();
    expect(client.config.endpoint && (await client.config.endpoint())).toEqual({
      hostname: 'testEndpoint.com'.toLowerCase(),
      path: '/buckets/',
      port: undefined,
      protocol: 'https:',
      query: undefined
    });
    expect(credentials.accessKeyId).toBe('fallback-key');
    expect(credentials.secretAccessKey).toBe('fallback-secret');
    expect(bucket).toBe('files-crud');
  });

  test('S3StorageAdapter->constructor creates client and sets bucket correctly, with pathStyleForcing.', async (): Promise<void> => {
    loadConfig({ storage: { name: 's3', forcePathStyle: true } });
    const storage = new S3StorageAdapter();

    const [client, bucket] = storage.getConf();
    const credentials = await client.config.credentials();
    expect(await client.config.region()).toBe('eu-central-1');
    expect(client.config.forcePathStyle).toBe(true);
    expect(credentials.accessKeyId).toBe('fallback-key');
    expect(credentials.secretAccessKey).toBe('fallback-secret');
    expect(bucket).toBe('files-crud');
  });

  test('S3StorageAdapter->constructor creates client and sets bucket correctly, global credentials and region.', async (): Promise<void> => {
    loadConfig({ storage: { name: 's3' }, accessKeyId: 'global-key', secretAccessKey: 'global-secret', region: 'de' });
    const storage = new S3StorageAdapter();

    const [client, bucket] = storage.getConf();
    const credentials = await client.config.credentials();
    expect(await client.config.region()).toBe('de');
    expect(credentials.accessKeyId).toBe('global-key');
    expect(credentials.secretAccessKey).toBe('global-secret');
    expect(bucket).toBe('files-crud');
  });

  test('S3StorageAdapter->constructor creates client and sets bucket correctly, specific credentials and region.', async (): Promise<void> => {
    loadConfig({
      storage: { name: 's3', accessKeyId: 'specific-key', secretAccessKey: 'specific-secret', region: 'us' },
      accessKeyId: 'global-key',
      secretAccessKey: 'global-secret',
      region: 'de'
    });
    const storage = new S3StorageAdapter();

    const [client, bucket] = storage.getConf();
    const credentials = await client.config.credentials();
    expect(await client.config.region()).toBe('us');
    expect(credentials.accessKeyId).toBe('specific-key');
    expect(credentials.secretAccessKey).toBe('specific-secret');
    expect(bucket).toBe('files-crud');
  });

  test('S3StorageAdapter->write creates object, string.', async (): Promise<void> => {
    const storage = new S3StorageAdapter();
    await storage.write('file', 'content', 'utf8');

    expect(mocked_s3['files-crud|file']).toEqual(Buffer.from('content', 'utf8'));
  });

  test('S3StorageAdapter->write creates object, buffer.', async (): Promise<void> => {
    const storage = new S3StorageAdapter();
    await storage.write('file', Buffer.from('content', 'utf8'));

    expect(mocked_s3['files-crud|file']).toEqual(Buffer.from('content', 'utf8'));
  });

  test('S3StorageAdapter->read reads file, read.', async (): Promise<void> => {
    mocked_s3['files-crud|file'] = Buffer.from('content', 'utf8');
    const storage = new S3StorageAdapter();

    const content = await storage.read('file', 'utf8');

    expect(content).toBe('content');
  });

  test('S3StorageAdapter->read reads file, buffer.', async (): Promise<void> => {
    mocked_s3['files-crud|file'] = Buffer.from('content', 'utf8');
    const storage = new S3StorageAdapter();

    const content = await storage.read('file');

    expect(content.toString('utf8')).toBe('content');
  });

  test('S3StorageAdapter->delete deletes object.', async (): Promise<void> => {
    mocked_s3['files-crud|file'] = Buffer.from('');
    mocked_s3['files-crud|file2'] = Buffer.from('');
    const storage = new S3StorageAdapter();

    await storage.delete('file');

    expect(mocked_s3['files-crud|file']).toBeUndefined();
    expect(mocked_s3['files-crud|file2']).toEqual(Buffer.from(''));
  });

  test('S3StorageAdapter->copy copies file.', async (): Promise<void> => {
    mocked_s3['files-crud|file'] = Buffer.from('testContent', 'utf8');
    mocked_s3['files-crud|other'] = Buffer.from('');
    const storage = new S3StorageAdapter();

    await storage.copy('file', 'fileCopy');

    expect(mocked_s3['files-crud|file']).toEqual(Buffer.from('testContent', 'utf8'));
    expect(mocked_s3['files-crud|fileCopy']).toEqual(Buffer.from('testContent', 'utf8'));
  });
});
