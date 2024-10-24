class FileAlreadyExistsError extends Error {
  public readonly name = 'FileAlreadyExistsError';

  constructor(path: string) {
    super(`File ${path} already exists.`);
  }
}

export { FileAlreadyExistsError };
