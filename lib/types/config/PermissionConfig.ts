import Permissions from '@/types/config/Permissions';

interface PermissionConfig {
  admin?: Permissions;
  owner?: Permissions;
  user?: Permissions;
  public?: Permissions;
}

export default PermissionConfig;
