import FSWrapper from '@/types/FSWrapper';
import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { getObjectBody, putObject, deleteObject, exists } from './S3FSWrapperHelper';

class S3FSWrapper implements FSWrapper {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(region: string, accessKeyId: string, secretAccessKey: string, bucket: string) {
    const config: S3ClientConfig = {
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    };
    this.client = new S3Client(config);
    this.bucket = bucket;
  }

  public getConf(): [S3Client, string] {
    return [this.client, this.bucket];
  }

  public async writeFile(name: string, data: string | Buffer, encoding?: BufferEncoding): Promise<void> {
    const body = typeof data === 'string' ? Buffer.from(data, encoding ?? 'utf8') : data;
    await putObject(this.client, this.bucket, name, false, body);
  }

  public async readFile(name: string, encoding?: BufferEncoding): Promise<Buffer | string> {
    const data = await getObjectBody(this.client, this.bucket, name);
    return encoding ? data.toString(encoding) : data;
  }

  public async unlink(name: string): Promise<void> {
    await deleteObject(this.client, this.bucket, name, false);
  }

  public async exists(name: string): Promise<boolean> {
    return await exists(this.client, this.bucket, name);
  }
}

export { S3FSWrapper, exists };
