class DirectoryDoesNotExistError extends Error {
  public readonly name = 'DirectoryDoesNotExistError';

  constructor(path: string) {
    super(`Directory ${path} does not exist.`);
  }
}

export { DirectoryDoesNotExistError };
