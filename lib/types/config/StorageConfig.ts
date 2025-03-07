interface StorageConfig {
  name: 'fs' | 's3';
  path?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

export { StorageConfig };
