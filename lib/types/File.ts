interface File {
  path: string;
  owner: string;
  realName: string;
  meta?: Record<string, unknown>;
}

export default File;
