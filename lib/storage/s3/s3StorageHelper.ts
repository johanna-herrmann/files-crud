import {
  S3Client,
  GetObjectCommand,
  GetObjectCommandInput,
  GetObjectCommandOutput,
  PutObjectCommandInput,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  CopyObjectCommand,
  CopyObjectCommandInput
} from '@aws-sdk/client-s3';

const trim = function (path: string): string {
  return path.replace(/(^\/+|\/+$)/gu, '').trim();
};

const getObject = async function (client: S3Client, Bucket: string, Key: string): Promise<GetObjectCommandOutput> {
  const commandInput: GetObjectCommandInput = {
    Bucket,
    Key
  };
  const command = new GetObjectCommand(commandInput);
  return await client.send(command);
};

const getObjectBody = async function (client: S3Client, Bucket: string, Key: string): Promise<Buffer> {
  const result = await getObject(client, Bucket, trim(Key));
  const dataArray = await result.Body?.transformToByteArray();

  return Buffer.from(dataArray ?? new Uint8Array());
};

const putObject = async function (client: S3Client, Bucket: string, key: string, Body: Buffer): Promise<void> {
  const Key = trim(key);
  const commandInput: PutObjectCommandInput = {
    Bucket,
    Key,
    Body
  };
  const command = new PutObjectCommand(commandInput);
  await client.send(command);
};

const deleteObject = async function (client: S3Client, Bucket: string, key: string): Promise<void> {
  const Key = trim(key);
  const commandInput: DeleteObjectCommandInput = {
    Bucket,
    Key
  };
  const command = new DeleteObjectCommand(commandInput);
  await client.send(command);
};

const copyObject = async function (client: S3Client, Bucket: string, copySource: string, key: string): Promise<void> {
  const Key = trim(key);
  const CopySource = trim(copySource);
  const commandInput: CopyObjectCommandInput = {
    Bucket,
    CopySource,
    Key
  };
  const command = new CopyObjectCommand(commandInput);
  await client.send(command);
};

export { trim, getObjectBody, putObject, deleteObject, copyObject };
