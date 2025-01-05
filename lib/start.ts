import { loadLogger } from '@/logging';
import { startServer } from '@/server/server';
import { loadConfig } from '@/config';

const start = function () {
  const start = Date.now();
  loadConfig();
  const logger = loadLogger();
  logger.info('Starting application...');
  startServer(start);
};

export { start };
