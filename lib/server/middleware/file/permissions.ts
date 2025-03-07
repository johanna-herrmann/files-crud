import paths from 'path';
import { getFullConfig } from '@/config/config';
import User from '@/types/user/User';
import FileData from '@/types/storage/FileData';
import Right from '@/types/config/Right';

const isFileOperation = function (operation: Right | 'list'): boolean {
  return /^read|update|delete$/.test(operation);
};

const isDirectoryOperation = function (operation: Right | 'list'): boolean {
  return /^create|list$/.test(operation);
};

const getDirectoryPermissions = function (directoryPermissions: Record<string, string | string[]>, path: string): string | string[] | undefined {
  const sortedKeys = Object.keys(directoryPermissions).sort((a: string, b: string) => {
    const levelsA = a.split('/').length;
    const levelsB = b.split('/').length;
    if (levelsA > levelsB) {
      return -1;
    }
    if (levelsA < levelsB) {
      return 1;
    }
    return 0;
  });
  const key = sortedKeys.find((key) => {
    const suffixedPath = path.replace('/+$', '') + '/';
    const suffixedKey = key.replace('/+$', '') + '/';
    return suffixedPath.startsWith(suffixedKey) || suffixedPath.replace(/^user_[^\/]*/, '$user').startsWith(suffixedKey);
  });
  return key ? directoryPermissions[key] : undefined;
};

const parseLevelPermissions = function (permissions: string | string[], levelIndex: 0 | 1 | 2): Right[] {
  const rights: Right[] = ['create', 'read', 'update', 'delete'];
  const rightsSet: Right[] = [];
  if (typeof permissions === 'string' && /^([c-][r-][u-][d-]){3}$/iu.test(permissions)) {
    const start = levelIndex * 4;
    const levelPermissions = permissions.substring(start, start + 4);
    rights.forEach((right) => {
      if (levelPermissions.toLowerCase().includes(right.charAt(0))) {
        rightsSet.push(right);
      }
    });
  }
  if (typeof permissions === 'string' && /^[0-9a-f]{3}$/iu.test(permissions)) {
    const levelPermissions = permissions.charAt(levelIndex);
    rights.forEach((right) => {
      const bitValue = 2 ** (3 - rights.indexOf(right));
      const digit = parseInt(levelPermissions, 16);
      if (digit & bitValue) {
        rightsSet.push(right);
      }
    });
  }
  if (typeof permissions === 'object' && 'push' in permissions) {
    const levelPermissions = permissions[levelIndex];
    levelPermissions.split('-').forEach((permission) => {
      if (/(create|read|update|delete)/i.test(permission)) {
        rightsSet.push(permission.toLowerCase() as Right);
      }
    });
  }

  return rightsSet;
};

const parsePermissions = function (permissions: string | string[], level: 'owner' | 'user' | 'public'): Right[] {
  const levels = ['owner', 'user', 'public'];
  const levelIndex = levels.indexOf(level);
  return parseLevelPermissions(permissions, levelIndex as 0 | 1 | 2);
};

const getPermissions = function (user: User | null, path: string, data: FileData, exists: boolean, operation: Right | 'list'): Right[] {
  if (user?.admin) {
    return ['create', 'read', 'update', 'delete'];
  }

  const config = getFullConfig();
  const directory = operation === 'list' ? path : paths.dirname(paths.join(paths.sep, path)).substring(1);
  const directoryPermissions = config.directoryPermissions as Record<string, string | string[]>;
  const permissions = getDirectoryPermissions(directoryPermissions, directory) ?? config.defaultPermissions ?? '';

  const expectedPublicFileOwner = config.publicFileOwner === 'all' ? 'public' : 'none';
  if (exists && (data?.owner === expectedPublicFileOwner || data?.owner === user?.id) && isFileOperation(operation)) {
    return parsePermissions(permissions, 'owner');
  }

  if (!!user && path.split('/')[0] === `user_${user?.id}` && isDirectoryOperation(operation)) {
    return parsePermissions(permissions, 'owner');
  }

  if (!!user) {
    return parsePermissions(permissions, 'user');
  }

  return parsePermissions(permissions, 'public');
};

export { getPermissions };
