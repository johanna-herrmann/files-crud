class DirectoryIsNotEmptyError extends Error {
  public readonly name = 'DirectoryIsNotEmptyError';

  constructor(path: string) {
    super(`Directory ${path} is not empty, so deletion must be forced.`);
  }
}

export { DirectoryIsNotEmptyError };
