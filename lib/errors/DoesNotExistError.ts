class DoesNotExistError extends Error {
  public readonly name = 'DoesNotExistError';

  constructor(path: string) {
    super(`${path} does not exist.`);
  }
}

export { DoesNotExistError };
