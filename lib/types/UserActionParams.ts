interface UserActionParams {
  action: 'add' | 'delete' | 'admin' | 'username' | 'password' | 'meta' | 'one' | 'list';
  username?: string;
}

export default UserActionParams;
