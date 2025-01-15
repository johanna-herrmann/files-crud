import fs from 'fs';
import yaml from 'yaml';
import { readEnv } from 'read-env';
import Config from '../types/config/Config';
import { loadFullConfig } from '@/config/fullConfig';

const config: Config = {};
let fullConfig: Config = {};

const getConfigString = function () {
  if (fs.existsSync('./config.json')) {
    return fs.readFileSync('./config.json', 'utf-8') || '{}';
  }
  if (fs.existsSync('./config.yaml')) {
    return JSON.stringify(yaml.parse(fs.readFileSync('./config.yaml', 'utf-8'))) || '{}';
  }
  if (fs.existsSync('./config.yml')) {
    return JSON.stringify(yaml.parse(fs.readFileSync('./config.yml', 'utf-8'))) || '{}';
  }
  return '{}';
};

const getConfigFromFile = function (): Record<string, unknown> {
  const configString = getConfigString();
  return JSON.parse(configString) as Record<string, unknown>;
};

const getConfigFromEnv = function (): Record<string, unknown> {
  return readEnv('FILES_CRUD');
};

const mergeConfigs = function (fileConfig: Record<string, unknown>, envConfig: Record<string, unknown>): void {
  Object.entries(envConfig).forEach(([key, value]) => {
    if (!!value && typeof value === 'object' && !('push' in value)) {
      if (!fileConfig[key]) {
        fileConfig[key] = {};
      }
      return mergeConfigs(fileConfig[key] as Record<string, unknown>, envConfig[key] as Record<string, unknown>);
    }
    fileConfig[key] = value;
  });
};

const getNewConfig = function (config_?: Config): Record<string, unknown> {
  if (config_) {
    return config_ as Record<string, unknown>;
  }
  const config = getConfigFromFile();
  const envConfig = getConfigFromEnv();
  mergeConfigs(config, envConfig);
  return config;
};

const loadConfig = function (config_?: Config) {
  const newConfig = getNewConfig(config_);
  Object.keys(config).forEach((key) => delete (config as Record<string, unknown>)[key]);
  Object.keys(newConfig).forEach((key) => ((config as Record<string, unknown>)[key] = newConfig[key]));
  fullConfig = loadFullConfig(config);
};

const getConfig = function (): Config {
  return config;
};

const getFullConfig = function (): Config {
  return fullConfig;
};

loadConfig();

export { getConfig, getFullConfig, loadConfig };
