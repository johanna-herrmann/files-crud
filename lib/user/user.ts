import { closeDb, loadDb } from '@/database';

const setAdminState = async function (username: string, admin: boolean): Promise<void> {
  try {
    const db = await loadDb();
    if (admin) {
      return await db.makeUserAdmin(username);
    }
    await db.makeUserNormalUser(username);
  } finally {
    await closeDb();
  }
};

const modifyMeta = async function (username: string, meta?: Record<string, unknown>): Promise<void> {
  try {
    const db = await loadDb();
    await db.modifyUserMeta(username, meta);
  } finally {
    await closeDb();
  }
};

export { setAdminState, modifyMeta };
