import FailedLoginAttempts from './FailedLoginAttempts';
import User from './User';
import File from './File';
import JwtKey from './JwtKey';

type DbItem = User | JwtKey | FailedLoginAttempts | File;

export default DbItem;
