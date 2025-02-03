import { getPermissions } from '@/server/middleware/file/permissions';
import { testUser } from '#/testItems';
import { loadConfig } from '@/config/config';
import { Logger } from '@/logging/Logger';
import Config from '@/types/config/Config';
import User from '@/types/user/User';
import FileData from '@/types/storage/FileData';
import Right from '@/types/config/Right';

const ownerPath = `user_${testUser.id}/file`;
const ownerData = { owner: testUser.id, meta: {}, contentType: '', size: 42, md5: '0'.repeat(32) };
const nullData: FileData = { owner: '', meta: {}, contentType: '', size: -1, md5: '' };
const admin = { ...testUser, admin: true };

jest.mock('@/logging/index', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    resetLogger() {},
    loadLogger(): Logger {
      return {
        debug() {
          return this;
        },
        info() {
          return this;
        },
        warn() {
          return this;
        },
        error() {
          return this;
        }
      } as unknown as Logger;
    }
  };
});

const runTest = async function (
  config: Config,
  user: User | null,
  path: string,
  data: FileData,
  exists: boolean,
  operation: Right | 'list',
  expectedPermissions: Right[]
): Promise<void> {
  loadConfig(config);

  const actualPermissions = getPermissions(user, path, data, exists, operation);

  expect(actualPermissions).toEqual(expectedPermissions);
};

describe('getPermissions', (): void => {
  describe('allPermissions', (): void => {
    test('returns [create, read, update, delete] for admin', async (): Promise<void> => {
      await runTest({}, admin, 'file', nullData, false, 'read', ['create', 'read', 'update', 'delete']);
    });

    test('returns [read, update, delete] for owner, directory', async (): Promise<void> => {
      await runTest({}, testUser, ownerPath, nullData, false, 'list', ['create', 'read', 'update', 'delete']);
    });

    test('returns [create, read, update, delete] for owner, file', async (): Promise<void> => {
      await runTest({}, testUser, 'file', ownerData, true, 'update', ['create', 'read', 'update', 'delete']);
    });

    test('returns [create, read] for user', async (): Promise<void> => {
      await runTest({}, testUser, 'file', nullData, false, 'read', ['create', 'read']);
    });

    test('returns [] for public access', async (): Promise<void> => {
      await runTest({}, null, 'file', nullData, false, 'read', []);
    });
  });

  describe('defaultPermissions', (): void => {
    test('returns [create, read, update, delete] for admin', async (): Promise<void> => {
      const config = { defaultPermissions: '000' };
      await runTest(config, admin, 'file', nullData, false, 'read', ['create', 'read', 'update', 'delete']);
    });

    test('returns [create, read, update, delete] for owner, directory', async (): Promise<void> => {
      await runTest({ defaultPermissions: '100' }, testUser, ownerPath, nullData, false, 'list', ['delete']);
    });

    test('returns [delete] for owner, file', async (): Promise<void> => {
      await runTest({ defaultPermissions: '100' }, testUser, 'file', ownerData, true, 'update', ['delete']);
    });

    test('returns [delete] for user', async (): Promise<void> => {
      await runTest({ defaultPermissions: '010' }, testUser, 'file', nullData, false, 'read', ['delete']);
    });

    test('returns [delete] for pubic', async (): Promise<void> => {
      await runTest({ defaultPermissions: '001' }, null, 'file', nullData, false, 'read', ['delete']);
    });
  });

  describe('directoryPermissions', (): void => {
    const buildDirectoryPermissions = function (level: 0 | 1 | 2): Config {
      const reads = ['400', '040', '004'];
      const deletes = ['100', '010', '001'];
      return {
        defaultPermissions: reads[level],
        directoryPermissions: { dir: deletes[level] }
      };
    };

    test('returns [delete] for owner, file', async (): Promise<void> => {
      await runTest(buildDirectoryPermissions(0), testUser, 'dir/file', ownerData, true, 'update', ['delete']);
    });

    test('returns [delete] for user', async (): Promise<void> => {
      await runTest(buildDirectoryPermissions(1), testUser, 'dir/file', nullData, false, 'read', ['delete']);
    });

    test('returns [delete] for pubic', async (): Promise<void> => {
      await runTest(buildDirectoryPermissions(2), null, 'dir/file', nullData, false, 'read', ['delete']);
    });
  });

  describe('specific permissions', (): void => {
    describe('parses letters correctly', (): void => {
      test('no access', async (): Promise<void> => {
        await runTest({ defaultPermissions: '-'.repeat(12) }, testUser, 'dir/file', nullData, false, 'read', []);
      });

      test('full access, owner', async (): Promise<void> => {
        await runTest({ defaultPermissions: 'crud'.repeat(3) }, testUser, 'dir/file', ownerData, true, 'update', [
          'create',
          'read',
          'update',
          'delete'
        ]);
      });

      test('full access, user', async (): Promise<void> => {
        await runTest({ defaultPermissions: 'crud'.repeat(3) }, testUser, 'dir/file', nullData, false, 'read', [
          'create',
          'read',
          'update',
          'delete'
        ]);
      });

      test('full access, public', async (): Promise<void> => {
        await runTest({ defaultPermissions: 'crud'.repeat(3) }, null, 'dir/file', ownerData, true, 'read', ['create', 'read', 'update', 'delete']);
      });

      test('rud spread, read for owner', async (): Promise<void> => {
        await runTest({ defaultPermissions: '-r----u----d' }, testUser, ownerPath, nullData, false, 'list', ['read']);
      });

      test('rud spread, update for user', async (): Promise<void> => {
        await runTest({ defaultPermissions: '-r----u----d' }, testUser, 'dir/file', nullData, false, 'update', ['update']);
      });

      test('rud spread, delete for public', async (): Promise<void> => {
        await runTest({ defaultPermissions: '-r----u----d' }, null, 'dir/file', nullData, false, 'delete', ['delete']);
      });

      test('cru for user', async (): Promise<void> => {
        await runTest({ defaultPermissions: '----cru-----' }, testUser, 'dir/file', nullData, false, 'read', ['create', 'read', 'update']);
      });
    });

    describe('parses hex digits correctly', (): void => {
      test('no access', async (): Promise<void> => {
        await runTest({ defaultPermissions: '000' }, null, 'dir/file', nullData, false, 'read', []);
      });

      test('full access, owner', async (): Promise<void> => {
        await runTest({ defaultPermissions: 'fff' }, testUser, 'dir/file', ownerData, true, 'update', ['create', 'read', 'update', 'delete']);
      });

      test('full access, user', async (): Promise<void> => {
        await runTest({ defaultPermissions: 'fff' }, testUser, 'dir/file', nullData, false, 'read', ['create', 'read', 'update', 'delete']);
      });

      test('full access, public', async (): Promise<void> => {
        await runTest({ defaultPermissions: 'fff' }, null, 'dir/file', ownerData, true, 'read', ['create', 'read', 'update', 'delete']);
      });

      test('rud spread, read for owner', async (): Promise<void> => {
        await runTest({ defaultPermissions: '421' }, testUser, ownerPath, nullData, false, 'list', ['read']);
      });

      test('rud spread, update for user', async (): Promise<void> => {
        await runTest({ defaultPermissions: '421' }, testUser, 'dir/file', nullData, false, 'update', ['update']);
      });

      test('rud spread, delete for public', async (): Promise<void> => {
        await runTest({ defaultPermissions: '421' }, null, 'dir/file', nullData, false, 'delete', ['delete']);
      });

      test('cru for user', async (): Promise<void> => {
        await runTest({ defaultPermissions: '0e0' }, testUser, 'dir/file', nullData, false, 'read', ['create', 'read', 'update']);
      });
    });
  });

  describe('directoryPermissions works in depths', (): void => {
    test('1', async (): Promise<void> => {
      const config = {
        defaultPermissions: '000',
        directoryPermissions: { dir: '040' }
      };
      await runTest(config, testUser, 'dir/file', nullData, false, 'read', ['read']);
    });

    test('2', async (): Promise<void> => {
      const config = {
        defaultPermissions: '000',
        directoryPermissions: { dir: '010', 'dir/sub': '040' }
      };
      await runTest(config, testUser, 'dir/sub/file', nullData, false, 'read', ['read']);
    });

    test('3', async (): Promise<void> => {
      const config = {
        defaultPermissions: '000',
        directoryPermissions: { dir: '010', 'dir/sub': '020', 'dir/sub/sub2': '040' }
      };
      await runTest(config, testUser, 'dir/sub/sub2/file', nullData, false, 'read', ['read']);
    });

    test('with owner id placeholder', async (): Promise<void> => {
      const config = {
        defaultPermissions: '000',
        directoryPermissions: { dir: '010', 'dir/sub': '020', '$user/sub/sub2': '040' }
      };
      await runTest(config, testUser, 'user_id42/sub/sub2/file', nullData, false, 'read', ['read']);
    });
  });
});
