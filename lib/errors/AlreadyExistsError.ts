class AlreadyExistsError extends Error {
  public readonly name = 'AlreadyExistsError';

  constructor(path: string) {
    super(`${path} already exists.`);
  }
}

export { AlreadyExistsError };
