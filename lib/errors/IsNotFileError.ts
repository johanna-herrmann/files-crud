class IsNotFileError extends Error {
  public readonly name = 'IsNotFileError';

  constructor(path: string) {
    super(`${path} is not a file.`);
  }
}

export { IsNotFileError };
