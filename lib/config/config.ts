import fs from 'fs';
import yaml from 'yaml';
import { readEnv } from 'read-env';
import { loadFullConfig } from '@/config/fullConfig';
import Config from '@/types/config/Config';

const config: Config = {};
let fullConfig: Config = {};
let envPrefix = 'FILES_CRUD';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const patchEnvForSeparatedDirectoryPermissions = function (env: Record<string, any>): void {
  if (!env.directoryPermissions?.directories || !env.directoryPermissions?.permissions) {
    return;
  }
  const directories = env.directoryPermissions.directories.split(',').map((directory: string) => directory.trim()) as string[];
  const permissions = env.directoryPermissions.permissions.split(',').map((permission: string) => permission.trim()) as string[];
  const length = Math.min(directories.length, permissions.length);
  for (let i = 0; i < length; i++) {
    const notation = permissions[i];
    env.directoryPermissions[directories[i]] = notation.includes(':') ? notation.split(':') : notation;
  }
  delete env.directoryPermissions.directories;
  delete (env.directoryPermissions as Record<string, unknown>).permissions;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const patchEnvForPermissions = function (env: Record<string, any>): void {
  if (!!env.defaultPermissions && typeof env.defaultPermissions === 'number') {
    env.defaultPermissions = `${(env.defaultPermissions + '').padStart(3, '0')}`;
  }
  if (!!env.defaultPermissions && env.defaultPermissions.includes(',')) {
    env.defaultPermissions = env.defaultPermissions.split(',');
  }
  if (!env.directoryPermissions) {
    return;
  }
  const directoryPermissions = env.directoryPermissions ?? {};
  env.directoryPermissions = {};
  Object.entries(directoryPermissions).forEach(([key, value]) => {
    if (typeof value === 'number') {
      return (env.directoryPermissions[key] = `${(value + '').padStart(3, '0')}`);
    }
    if ((value as string).includes(',')) {
      return (env.directoryPermissions[key] = (value as string).split(','));
    }
    env.directoryPermissions[key] = value;
  });
};

const getConfigFromEnv = function (): Record<string, unknown> {
  const env = readEnv(envPrefix);
  patchEnvForSeparatedDirectoryPermissions(env);
  patchEnvForPermissions(env);
  if (typeof env.tokens === 'string') {
    env.tokens = env.tokens.split(',').map((token: string) => token.trim());
  }
  return env;
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

const setEnvPrefix = function (prefix: string): void {
  envPrefix = prefix;
};

const getEnvPrefix = function (): string {
  return envPrefix;
};

loadConfig();

const reloadConfig = function () {
  loadConfig();
};

export { getConfig, getFullConfig, loadConfig, setEnvPrefix, getEnvPrefix, reloadConfig };
