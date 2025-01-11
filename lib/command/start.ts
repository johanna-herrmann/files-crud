import { loadLogger } from '@/logging';
import { startServer } from '@/server/server';
import { loadConfig } from '@/config';

const start = function (start: number) {
  loadConfig();
  const logger = loadLogger();
  logger.info('Starting application...');
  startServer(start);
};

export { start };
