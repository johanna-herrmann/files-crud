import { User } from '@/types/user/User';

type UserWithoutHashVersion = Omit<User, 'hashVersion'>;
type UserWithoutHashVersionWithoutSalt = Omit<UserWithoutHashVersion, 'salt'>;
type UserDto = Omit<UserWithoutHashVersionWithoutSalt, 'hash'>;

export { UserDto };
