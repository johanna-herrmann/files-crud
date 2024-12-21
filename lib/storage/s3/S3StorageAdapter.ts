import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { getObjectBody, putObject, deleteObject, copyObject } from './s3StorageHelper';
import StorageAdapter from '@/types/StorageAdapter';
import { getConfig } from '@/config';

/**
 * StorageAdapter for s3 storage.
 * Stores files as objects in s3 bucket.
 * Uses file path as object key and file content as object body.
 */
class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const config = getConfig();
    const region = config.storage?.region || config.region || 'eu-central-1';
    const accessKeyId = config.storage?.accessKeyId || config.accessKeyId || 'fallback-key';
    const secretAccessKey = config.storage?.secretAccessKey || config.secretAccessKey || 'fallback-secret';
    const bucket = config.storage?.bucket ?? 'files-crud';
    const endpoint = config.storage?.endpoint;
    const forcePathStyle = config.storage?.forcePathStyle ?? false;
    const conf: S3ClientConfig = { region, forcePathStyle, credentials: { accessKeyId, secretAccessKey } };
    if (!!endpoint) {
      conf.endpoint = endpoint;
    }
    this.client = new S3Client(conf);
    this.bucket = bucket;
  }

  public getConf(): [S3Client, string] {
    return [this.client, this.bucket];
  }

  public async write(path: string, data: string | Buffer, encoding?: BufferEncoding): Promise<void> {
    const body = typeof data === 'string' ? Buffer.from(data, encoding ?? 'utf8') : data;
    await putObject(this.client, this.bucket, path, body);
  }

  public async read(path: string, encoding?: BufferEncoding): Promise<Buffer | string> {
    const data = await getObjectBody(this.client, this.bucket, path);
    return encoding ? data.toString(encoding) : data;
  }

  public async delete(path: string): Promise<void> {
    await deleteObject(this.client, this.bucket, path);
  }

  public async copy(path: string, copyName: string): Promise<void> {
    await copyObject(this.client, this.bucket, path, copyName);
  }
}

export { S3StorageAdapter };
