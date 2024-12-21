import FailedLoginAttempts from './FailedLoginAttempts';
import User from './User';
import JwtKey from './JwtKey';

type DbItem = User | JwtKey | FailedLoginAttempts;

export default DbItem;
