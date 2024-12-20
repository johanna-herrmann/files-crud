import Permissions from '@/types/Permissions';

interface PermissionConfig {
  admin?: Permissions;
  owner?: Permissions;
  user?: Permissions;
  public?: Permissions;
}

export default PermissionConfig;
