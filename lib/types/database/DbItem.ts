import FailedLoginAttempts from '../user/FailedLoginAttempts';
import User from '../user/User';
import JwtKey from '../user/JwtKey';

type DbItem = User | JwtKey | FailedLoginAttempts;

export default DbItem;
