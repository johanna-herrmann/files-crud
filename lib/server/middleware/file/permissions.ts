import PermissionConfig from '@/types/PermissionConfig';
import User from '@/types/User';
import FileData from '@/types/FileData';
import Permissions from '@/types/Permissions';
import { getConfig } from '@/config';
import paths from 'path';
import Config from '@/types/Config';

const allPermissions: Permissions = {
  create: true,
  read: true,
  update: true,
  delete: true
};

const getPermissionConfig = function (directory: string, config: Config, fileExists: boolean): PermissionConfig {
  if (fileExists && config.userFilePermissions) {
    return config.userFilePermissions;
  }
  if (directory.split('/')[0].startsWith('user_') && config.userDirectoryPermissions) {
    return config.userDirectoryPermissions;
  }
  const directoryPermissions = config.directoryPermissions ?? {};
  return directoryPermissions[directory.split('/')[0]] ?? config.defaultPermissions ?? {};
};

const getPermissions = function (user: User | null, path: string, data: FileData, exists: boolean, list: boolean): Permissions {
  const config = getConfig();
  const directory = list ? path : paths.dirname(paths.join(paths.sep, path)).substring(1);
  const permissionConfig = getPermissionConfig(directory, config, !list && exists);

  if (user?.admin) {
    return permissionConfig.admin ?? config.defaultPermissions?.admin ?? allPermissions;
  }

  if (data?.owner === user?.ownerId || path.split('/')[0] === `user_${user?.ownerId}`) {
    return permissionConfig.owner ?? permissionConfig.user ?? config.defaultPermissions?.owner ?? config.defaultPermissions?.user ?? { read: true };
  }

  if (!!user) {
    return permissionConfig.user ?? config.defaultPermissions?.user ?? { read: true };
  }

  return permissionConfig.public ?? config.defaultPermissions?.public ?? {};
};

export { getPermissions };
