import { loadLogger } from '@/logging';
import { startServer } from '@/server/server';

const start = function (start: number) {
  const logger = loadLogger();
  logger.info('Starting application...');
  startServer(start);
};

export { start };
