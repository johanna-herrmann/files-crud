interface User {
  id: string;
  username: string;
  hashVersion: string;
  salt: string;
  hash: string;
  admin: boolean;
  meta?: Record<string, unknown>;
}

export default User;
