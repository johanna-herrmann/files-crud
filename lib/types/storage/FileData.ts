interface FileData {
  owner?: string;
  contentType: string;
  size: number;
  md5: string;
  meta?: Record<string, unknown>;
  key?: string;
}

export { FileData };
