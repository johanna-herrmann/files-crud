import paths from 'path';
import { getFullConfig } from '@/config/config';
import Config from '@/types/config/Config';
import PermissionConfig from '@/types/config/PermissionConfig';
import User from '@/types/user/User';
import FileData from '@/types/storage/FileData';
import Permissions from '@/types/config/Permissions';

const getPermissionConfig = function (directory: string, config: Config, fileExists: boolean): PermissionConfig {
  if (fileExists && config.userFilePermissions) {
    return config.userFilePermissions;
  }
  if (directory.split('/')[0].startsWith('user_') && config.userDirectoryPermissions) {
    return config.userDirectoryPermissions;
  }
  const directoryPermissions = config.directoryPermissions as Record<string, PermissionConfig>;
  return (directoryPermissions[directory.split('/')[0]] ?? config.defaultPermissions) as PermissionConfig;
};

const getPermissions = function (user: User | null, path: string, data: FileData, exists: boolean, list: boolean): Permissions {
  const config = getFullConfig();
  const directory = list ? path : paths.dirname(paths.join(paths.sep, path)).substring(1);
  //const permissionConfig = getPermissionConfig(directory, config, !list && exists);
  const directoriesPermissions = config.directoryPermissions as Record<string, PermissionConfig>;
  const userFilePermissions = exists && config.userFilePermissions ? config.userFilePermissions : {};
  const userDirectoryPermissions =
    directory.split('/')[0].startsWith('user_') && config.userDirectoryPermissions ? config.userDirectoryPermissions : {};
  const directoryPermissions = directoriesPermissions[directory.split('/')[0]] ?? {};
  const defaultPermissions = config.defaultPermissions as PermissionConfig;

  if (user?.admin) {
    return (userFilePermissions.admin ?? userDirectoryPermissions.admin ?? directoryPermissions.admin ?? defaultPermissions.admin) as Permissions;
  }

  if (data?.owner === user?.ownerId) {
    return (userFilePermissions.owner ?? directoryPermissions.owner ?? defaultPermissions) as Permissions;
  }

  if (path.split('/')[0] === `user_${user?.ownerId}`) {
    return (userDirectoryPermissions.owner ?? directoryPermissions.owner ?? defaultPermissions) as Permissions;
  }

  if (!!user) {
    return (userFilePermissions.user ?? userDirectoryPermissions?.user ?? directoryPermissions.user ?? defaultPermissions.user) as Permissions;
  }

  return (userFilePermissions.public ?? userDirectoryPermissions?.public ?? directoryPermissions.public ?? defaultPermissions.public) as Permissions;
};

export { getPermissions };
