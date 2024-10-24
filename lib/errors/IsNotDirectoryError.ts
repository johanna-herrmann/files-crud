class IsNotDirectoryError extends Error {
  public readonly name = 'IsNotDirectoryError';

  constructor(path: string) {
    super(`${path} is not a directory.`);
  }
}

export { IsNotDirectoryError };
