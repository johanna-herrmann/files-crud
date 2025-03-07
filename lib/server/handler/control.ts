import express from 'express';
import { loadLogger, reloadLogger } from '@/logging';
import { reloadConfig } from '@/config/config';
import { reloadDb } from '@/database';
import { reloadStorage } from '@/storage';
import { sendOK } from '@/server/util';
import { Request } from '@/types/server/Request';

const stopHandler = function (_: Request, res: express.Response): void {
  loadLogger().info('Received stop request. Stopping...');
  sendOK(res);
  process.exit(0);
};

const reloadHandler = async function (_: Request, res: express.Response): Promise<void> {
  loadLogger().info('Received reload request. Reloading...');
  reloadConfig();
  await reloadDb();
  reloadStorage();
  reloadLogger();
  loadLogger().info('Reloaded.');
  sendOK(res);
};

export { stopHandler, reloadHandler };
