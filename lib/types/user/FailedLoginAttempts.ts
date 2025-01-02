interface FailedLoginAttempts {
  username: string;
  attempts: number;
  lastAttempt: number;
}

export default FailedLoginAttempts;
