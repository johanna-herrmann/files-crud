import Storage from '@/types/Storage';
import { getConfig } from '@/config';
import { LocalStorage } from './local/LocalStorage';
import { S3Storage } from './s3/S3Storage';
import path from 'path';

let storage: Storage | null;

// TODO: test

// TODO: region also on "config.region" not only on "config.storage.region" and "config.database.region"
// (analog to accessKeyId and secretAccessKey) (don't forget to also modify @/database/index.ts)

const loadStorage = function (): Storage {
  const config = getConfig();
  if (!!storage) {
    return storage;
  }

  if (!config.storage || config.storage.name === 'local') {
    const directory = config.storage?.path ?? './files/';
    return (storage = new LocalStorage(path.normalize(directory)));
  }

  const region = config.storage.region || 'eu-central-1';
  const accessKeyId = config.storage.accessKeyId || config.accessKeyId || 'fallback-key';
  const secretAccessKey = config.storage.secretAccessKey || config.secretAccessKey || 'fallback-secret';
  const bucket = config.storage.bucket ?? 'files-crud';
  const endpoint = config.storage.endpoint;
  const forcePathStyle = config.storage.forcePathStyle;
  return (storage = new S3Storage(region, accessKeyId, secretAccessKey, bucket, endpoint, forcePathStyle));
};

const resetStorage = function (): void {
  storage = null;
};

export { loadStorage, resetStorage };
