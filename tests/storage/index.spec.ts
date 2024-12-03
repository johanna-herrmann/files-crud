import { loadStorage, resetStorage } from '@/storage';
import { LocalStorage } from '@/storage/local/LocalStorage';
import { S3Storage } from '@/storage/s3/S3Storage';
import mockFS from 'mock-fs';
import { loadConfig } from '@/config';

const expectS3Storage = async function (storage: S3Storage, key: string, secret: string, bucket: string, region: string): Promise<void> {
  const client = storage.getConf()[0];
  expect(storage).toBeInstanceOf(S3Storage);
  expect(await client.config.region()).toBe(region);
  expect((await client.config.credentials()).accessKeyId).toBe(key);
  expect((await client.config.credentials()).secretAccessKey).toBe(secret);
  expect(storage.getConf()[1]).toBe(bucket);
};

describe('storage', (): void => {
  afterEach(async (): Promise<void> => {
    mockFS.restore();
    resetStorage();
  });

  test('loadStorage loads local storage correctly, on empty config', async (): Promise<void> => {
    mockFS({ './config.json': '{}' });
    loadConfig();

    const storage = loadStorage() as LocalStorage;

    expect(storage).toBeInstanceOf(LocalStorage);
    expect(storage.getDirectory()).toBe('/files');
  });

  test('loadStorage loads local storage correctly, on specific config', async (): Promise<void> => {
    mockFS({ './config.json': '{"storage": {"name":"local", "path":"/opt/files-crud/files/"}}' });
    loadConfig();

    const storage = loadStorage() as LocalStorage;

    expect(storage).toBeInstanceOf(LocalStorage);
    expect(storage.getDirectory()).toBe('/opt/files-crud/files');
  });

  test('loadStorage loads s3 storage correctly, credentials and region given specifically.', async (): Promise<void> => {
    mockFS({
      './config.json':
        '{"storage":{"name":"s3", "accessKeyId":"key", "secretAccessKey":"secret", "region":"de"}, "accessKeyId":"test", "secretAccessKey":"test", "region":"us"}'
    });
    loadConfig();

    const storage = loadStorage() as S3Storage;

    await expectS3Storage(storage, 'key', 'secret', 'files-crud', 'de');
  });

  test('loadStorage loads s3 storage correctly, credentials and region given globally.', async (): Promise<void> => {
    mockFS({
      './config.json': '{"storage":{"name":"s3"}, "accessKeyId":"key", "secretAccessKey":"secret", "region":"de"}'
    });
    loadConfig();

    const storage = loadStorage() as S3Storage;

    await expectS3Storage(storage, 'key', 'secret', 'files-crud', 'de');
  });

  test('loadStorage loads s3 storage correctly, no credentials and region given.', async (): Promise<void> => {
    mockFS({
      './config.json': '{"storage":{"name":"s3"}}'
    });
    loadConfig();

    const storage = loadStorage() as S3Storage;

    await expectS3Storage(storage, 'fallback-key', 'fallback-secret', 'files-crud', 'eu-central-1');
  });

  test('loadStorage loads s3 storage correctly, bucket specified.', async (): Promise<void> => {
    mockFS({
      './config.json': '{"storage":{"name":"s3", "bucket":"specified-bucket"}}'
    });
    loadConfig();

    const storage = loadStorage() as S3Storage;

    await expectS3Storage(storage, 'fallback-key', 'fallback-secret', 'specified-bucket', 'eu-central-1');
  });

  test('loadStorage loads s3 storage correctly, endpoint specified.', async (): Promise<void> => {
    mockFS({
      './config.json': '{"storage":{"name":"s3", "endpoint":"https://testEndpoint.com/buckets/"}}'
    });
    loadConfig();

    const storage = loadStorage() as S3Storage;

    await expectS3Storage(storage, 'fallback-key', 'fallback-secret', 'files-crud', 'eu-central-1');
    const client = storage.getConf()[0];
    expect(client.config.endpoint && (await client.config.endpoint())).toEqual({
      hostname: 'testEndpoint.com'.toLowerCase(),
      path: '/buckets/',
      port: undefined,
      protocol: 'https:',
      query: undefined
    });
  });

  test('loadStorage loads s3 storage correctly, forcePathStyle specified.', async (): Promise<void> => {
    mockFS({
      './config.json': '{"storage":{"name":"s3", "forcePathStyle":true}}'
    });
    loadConfig();

    const storage = loadStorage() as S3Storage;

    await expectS3Storage(storage, 'fallback-key', 'fallback-secret', 'files-crud', 'eu-central-1');
    const client = storage.getConf()[0];
    expect(client.config.forcePathStyle).toBe(true);
  });
});
