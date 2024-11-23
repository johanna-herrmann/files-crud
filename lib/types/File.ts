interface File {
  path: string;
  folder: string;
  file: string;
  owner: string;
  realName: string;
  meta?: Record<string, unknown>;
}

export default File;
