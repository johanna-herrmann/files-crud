class FileDoesNotExistError extends Error {
  public readonly name = 'FileDoesNotExistError';

  constructor(path: string) {
    super(`File ${path} does not exist.`);
  }
}

export { FileDoesNotExistError };
