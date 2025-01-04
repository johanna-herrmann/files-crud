interface FileData {
  owner: string;
  contentType: string;
  size: number;
  meta: Record<string, unknown>;
}

export default FileData;
