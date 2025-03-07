interface File {
  data: Buffer;
  mimetype: string;
  md5: string;
}

interface Files {
  [key: string]: File;
}

export { Files };
