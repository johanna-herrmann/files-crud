import { getPermissions } from '@/server/middleware/file/permissions';
import { testUser } from '#/testItems';
import { loadConfig } from '@/config';
import Config from '@/types/config/Config';
import User from '@/types/user/User';
import FileData from '@/types/storage/FileData';
import Permissions from '@/types/config/Permissions';

const ownerPath = `user_${testUser.ownerId}/file`;
const ownerData = { owner: testUser.ownerId, meta: {}, contentType: '', size: 42 };
const nullData = { owner: '', meta: {}, contentType: '', size: -1 };
const admin = { ...testUser, admin: true };

const runTest = async function (
  config: Config,
  user: User | null,
  path: string,
  data: FileData,
  exists: boolean,
  list: boolean,
  expectedPermissions: Permissions
): Promise<void> {
  loadConfig(config);

  const actualPermissions = getPermissions(user, path, data, exists, list);

  expect(actualPermissions).toEqual(expectedPermissions);
};

describe('getPermissions', (): void => {
  describe('allPermissions', (): void => {
    test('returns [create, read, update, delete] for admin', async (): Promise<void> => {
      await runTest({}, admin, 'file', nullData, false, false, { create: true, read: true, update: true, delete: true });
    });

    test('returns [read] for owner, directory', async (): Promise<void> => {
      await runTest({}, testUser, ownerPath, nullData, false, false, { read: true });
    });

    test('returns [read] for owner, file', async (): Promise<void> => {
      await runTest({}, testUser, 'file', ownerData, false, false, { read: true });
    });

    test('returns [read] for user', async (): Promise<void> => {
      await runTest({}, testUser, 'file', nullData, false, false, { read: true });
    });

    test('returns [] for public access', async (): Promise<void> => {
      await runTest({}, null, 'file', nullData, false, false, {});
    });
  });

  describe('defaultPermissions', (): void => {
    test('returns [delete] for admin', async (): Promise<void> => {
      const config = { defaultPermissions: { admin: { delete: true } } };
      await runTest(config, admin, 'file', nullData, false, false, { delete: true });
    });

    test('returns [delete] for owner, directory', async (): Promise<void> => {
      await runTest({ defaultPermissions: { owner: { delete: true } } }, testUser, ownerPath, nullData, false, false, { delete: true });
    });

    test('returns [delete] for owner, file', async (): Promise<void> => {
      await runTest({ defaultPermissions: { owner: { delete: true } } }, testUser, 'file', ownerData, false, false, { delete: true });
    });

    test('returns [delete] for user', async (): Promise<void> => {
      await runTest({ defaultPermissions: { user: { delete: true } } }, testUser, 'file', nullData, false, false, { delete: true });
    });

    test('returns [delete] for pubic', async (): Promise<void> => {
      await runTest({ defaultPermissions: { public: { delete: true } } }, null, 'file', nullData, false, false, { delete: true });
    });
  });

  describe('directoryPermissions', (): void => {
    const buildDirectoryPermissions = function (level: 'admin' | 'owner' | 'user' | 'public'): Config {
      return {
        defaultPermissions: { [level]: { read: false } },
        directoryPermissions: { dir: { [level]: { delete: true } } }
      };
    };

    test('returns [delete] for admin', async (): Promise<void> => {
      await runTest(buildDirectoryPermissions('admin'), admin, 'dir/file', nullData, false, false, { delete: true });
    });

    test('returns [delete] for owner, file', async (): Promise<void> => {
      await runTest(buildDirectoryPermissions('owner'), testUser, 'dir/file', ownerData, false, false, { delete: true });
    });

    test('returns [delete] for user', async (): Promise<void> => {
      await runTest(buildDirectoryPermissions('user'), testUser, 'dir/file', nullData, false, false, { delete: true });
    });

    test('returns [delete] for pubic', async (): Promise<void> => {
      await runTest(buildDirectoryPermissions('public'), null, 'dir/file', nullData, false, false, { delete: true });
    });
  });

  describe('userDirectoryPermissions', (): void => {
    const buildDirectoryPermissions = function (level: 'admin' | 'owner' | 'user' | 'public'): Config {
      return {
        defaultPermissions: { [level]: { read: false } },
        directoryPermissions: { [`user_${testUser.ownerId}`]: { [level]: { update: true } } },
        userDirectoryPermissions: { [level]: { delete: true } }
      };
    };

    test('returns [delete] for admin', async (): Promise<void> => {
      await runTest(buildDirectoryPermissions('admin'), admin, ownerPath, nullData, false, false, { delete: true });
    });

    test('returns [delete] for owner, file', async (): Promise<void> => {
      await runTest(buildDirectoryPermissions('owner'), testUser, ownerPath, ownerData, false, false, { delete: true });
    });

    test('returns [delete] for user', async (): Promise<void> => {
      await runTest(buildDirectoryPermissions('user'), testUser, ownerPath, nullData, false, false, { delete: true });
    });

    test('returns [delete] for pubic', async (): Promise<void> => {
      await runTest(buildDirectoryPermissions('public'), null, ownerPath, nullData, false, false, { delete: true });
    });
  });

  describe('userFilePermissions', (): void => {
    const buildDirectoryPermissions = function (level: 'admin' | 'owner' | 'user' | 'public'): Config {
      return {
        defaultPermissions: { [level]: { read: false } },
        directoryPermissions: { dir: { [level]: { create: true } } },
        userDirectoryPermissions: { [level]: { update: true } },
        userFilePermissions: { [level]: { delete: true } }
      };
    };

    test('returns [delete] for admin, file', async (): Promise<void> => {
      await runTest(buildDirectoryPermissions('admin'), admin, 'dir/file', nullData, true, false, { delete: true });
    });

    test('returns [delete] for owner, file', async (): Promise<void> => {
      await runTest(buildDirectoryPermissions('owner'), testUser, 'dir/file', ownerData, true, false, { delete: true });
    });

    test('returns [delete] for owner, directory', async (): Promise<void> => {
      await runTest(buildDirectoryPermissions('owner'), testUser, ownerPath, nullData, true, false, { delete: true });
    });

    test('returns [delete] for user', async (): Promise<void> => {
      await runTest(buildDirectoryPermissions('user'), testUser, 'dir/file', nullData, true, false, { delete: true });
    });

    test('returns [delete] for pubic', async (): Promise<void> => {
      await runTest(buildDirectoryPermissions('public'), null, 'dir/file', nullData, true, false, { delete: true });
    });
  });

  describe('falls back correctly', (): void => {
    describe('permissions falls back', (): void => {
      test('from actual.admin to default.admin', async (): Promise<void> => {
        const config = {
          defaultPermissions: { admin: { delete: true } },
          directoryPermissions: { dir: {} }
        };
        await runTest(config, admin, 'dir/file', nullData, true, false, { delete: true });
      });

      test('from actual.admin to default.admin to fallback.all.', async (): Promise<void> => {
        const config = {
          defaultPermissions: {},
          directoryPermissions: { dir: {} }
        };
        await runTest(config, admin, 'dir/file', nullData, true, false, { create: true, read: true, update: true, delete: true });
      });

      test('from actual.owner to actual.user.', async (): Promise<void> => {
        const config = {
          defaultPermissions: { owner: { create: true } },
          directoryPermissions: { dir: { user: { delete: true } } }
        };
        await runTest(config, testUser, 'dir/file', ownerData, true, false, { delete: true });
      });

      test('from actual.owner to actual.user to default.owner.', async (): Promise<void> => {
        const config = {
          defaultPermissions: { owner: { delete: true } },
          directoryPermissions: { dir: {} }
        };
        await runTest(config, testUser, 'dir/file', ownerData, true, false, { delete: true });
      });

      test('from actual.owner to actual.user to default.owner to default.user.', async (): Promise<void> => {
        const config = {
          defaultPermissions: { user: { delete: true } },
          directoryPermissions: { dir: {} }
        };
        await runTest(config, testUser, 'dir/file', ownerData, true, false, { delete: true });
      });

      test('from actual.owner to actual.user to default.owner to default.user to fallback.read.', async (): Promise<void> => {
        const config = {
          defaultPermissions: {},
          directoryPermissions: { dir: {} }
        };
        await runTest(config, testUser, 'dir/file', ownerData, true, false, { read: true });
      });

      test('from actual.user to default.user.', async (): Promise<void> => {
        const config = {
          defaultPermissions: { user: { delete: true } },
          directoryPermissions: { dir: {} }
        };
        await runTest(config, testUser, 'dir/file', nullData, true, false, { delete: true });
      });

      test('from actual.user to default.user to fallback.read.', async (): Promise<void> => {
        const config = {
          defaultPermissions: {},
          directoryPermissions: { dir: {} }
        };
        await runTest(config, testUser, 'dir/file', nullData, true, false, { read: true });
      });

      test('from actual.public to default.public.', async (): Promise<void> => {
        const config = {
          defaultPermissions: { public: { delete: true } },
          directoryPermissions: { dir: {} }
        };
        await runTest(config, null, 'dir/file', nullData, true, false, { delete: true });
      });

      test('from actual.public to default.public to fallback.none.', async (): Promise<void> => {
        const config = {
          defaultPermissions: {},
          directoryPermissions: { dir: {} }
        };
        await runTest(config, null, 'dir/file', nullData, true, false, {});
      });
    });
  });
});
