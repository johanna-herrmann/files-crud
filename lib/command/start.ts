import { loadLogger } from '@/logging';
import { startServer } from '@/server/server';
import { initKeys } from '@/user/jwt';
import { createInitialAdminIfNoAdminExists } from '@/command/admin';
import { loadStorage } from '@/storage';

const start = async function (start: number) {
  const logger = loadLogger();
  logger.info('Starting application...');
  await initKeys();
  await createInitialAdminIfNoAdminExists();
  loadStorage();
  startServer(start);
};

export { start };
