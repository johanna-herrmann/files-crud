interface User {
  username: string;
  hashVersion: string;
  salt: string;
  hash: string;
  ownerId: string;
  admin: boolean;
  meta?: Record<string, unknown>;
}

export default User;
