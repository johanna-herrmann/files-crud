import fs from 'fs';
import Config from './types/Config';

const config: Config = {};

const getConfigString = function () {
  try {
    return fs.readFileSync('./config.json', 'utf-8') || '{}';
  } catch (error: unknown) {
    const errorToCheck = error as Error & { code?: string };
    if (errorToCheck.code === 'ENOENT') {
      return '{}';
    }
    throw error;
  }
};

const loadConfig = function () {
  const configString = getConfigString();
  const newConfig = JSON.parse(configString) as Record<string, unknown>;
  Object.keys(config).forEach((key) => delete (config as Record<string, unknown>)[key]);
  Object.keys(newConfig).forEach((key) => ((config as Record<string, unknown>)[key] = newConfig[key]));
};

const getConfig = function (): Config {
  return config;
};

loadConfig();

export { getConfig, loadConfig };
