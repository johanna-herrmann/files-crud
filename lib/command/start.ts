import { loadLogger } from '@/logging';
import { startServer } from '@/server/server';
import { initKeys } from '@/user/jwt';
import { createInitialAdminIfNoAdminExists } from '@/command/admin';

const start = async function (start: number) {
  const logger = loadLogger();
  logger.info('Starting application...');
  await initKeys();
  await createInitialAdminIfNoAdminExists();
  startServer(start);
};

export { start };
