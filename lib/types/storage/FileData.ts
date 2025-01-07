interface FileData {
  owner: string;
  contentType: string;
  size: number;
  md5: string;
  meta: Record<string, unknown>;
}

export default FileData;
