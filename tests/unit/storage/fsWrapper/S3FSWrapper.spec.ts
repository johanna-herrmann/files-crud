import { S3FSWrapper } from '@/storage/fsWrapper/S3FSWrapper';
import { S3Client } from '@aws-sdk/client-s3';

let mocked_s3: Record<string, Buffer | undefined> = {};

jest.mock('@/storage/fsWrapper/S3FSWrapperHelper', () => {
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
    async exists(client: S3Client, Bucket: string, Key: string): Promise<boolean> {
      return !!mocked_s3[`${Bucket}|${Key}`];
    }
  };
});

const wrapper = new S3FSWrapper('de', 'accessId', 'secret', 'bucket');

describe('S3FSWrapper', (): void => {
  afterEach(async (): Promise<void> => {
    mocked_s3 = {};
  });

  test('S3FSWrapper->constructor created client and set bucket correctly.', async (): Promise<void> => {
    const newWrapper = new S3FSWrapper('de', 'accessId', 'secret', 'bucket');

    const [client, bucket] = newWrapper.getConf();
    const credentials = await client.config.credentials();
    expect(await client.config.region()).toBe('de');
    expect(credentials.accessKeyId).toBe('accessId');
    expect(credentials.secretAccessKey).toBe('secret');
    expect(bucket).toBe('bucket');
  });

  test('S3FSWrapper->writeFile creates object.', async (): Promise<void> => {
    await wrapper.writeFile('file', 'content', 'utf8');

    expect(mocked_s3['bucket|file']).toEqual(Buffer.from('content', 'utf8'));
  });

  test('S3FSWrapper->readFile reads file.', async (): Promise<void> => {
    mocked_s3['bucket|file'] = Buffer.from('content', 'utf8');

    const content = await wrapper.readFile('file', 'utf8');

    expect(content).toBe('content');
  });

  test('S3FSWrapper->unlink deletes object.', async (): Promise<void> => {
    mocked_s3['bucket|file'] = Buffer.from('');
    mocked_s3['bucket|file2'] = Buffer.from('');

    await wrapper.unlink('file');

    expect(mocked_s3['bucket|file']).toBeUndefined();
    expect(mocked_s3['bucket|file2']).toEqual(Buffer.from(''));
  });

  test('S3FSWrapper->exists returns correct value for the check.', async (): Promise<void> => {
    mocked_s3['bucket|file'] = Buffer.from('');

    const result1 = await wrapper.exists('file');
    const result2 = await wrapper.exists('nope');

    expect(result1).toBe(true);
    expect(result2).toBe(false);
  });
});
