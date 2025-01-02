interface PasswordHashing {
  version: string;
  hashPassword: (password: string) => Promise<[string, string]>;
  checkPassword: (password: string, salt: string, hash: string) => Promise<boolean>;
}

export default PasswordHashing;
