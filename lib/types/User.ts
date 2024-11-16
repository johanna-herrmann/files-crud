interface User {
  username: string;
  hashVersion: string;
  salt: string;
  hash: string;
  sectionId: string;
  admin: boolean;
  meta?: Record<string, unknown>;
}

export default User;
