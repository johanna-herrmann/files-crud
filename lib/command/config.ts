import yaml from 'yaml';
import { getConfig } from '@/config/config';
import { printer } from '@/printing/printer';
import Config from '@/types/config/Config';

type Format = 'json' | 'yaml' | 'env' | 'properties';

const toEnv = function (config: Config): string[] {
  const properties = toPropertiesNotation(config);
  return properties.map((property) => {
    const [key, value] = property.split('=');
    const envKey = `FILES_CRUD_${key
      .replace(/\./g, '__')
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase()}`;
    return [envKey, value].join('=');
  });
};

const toPropertiesNotation = function (config: Config, prefix = '', entries: string[] = []): string[] {
  Object.entries(config).forEach(([key, value]) => {
    if (typeof value === 'object' && 'push' in value) {
      return entries.push(`${prefix}${key}=${value.join(',')}`);
    }
    if (typeof value !== 'object') {
      return entries.push(`${prefix}${key}=${value}`);
    }
    return toPropertiesNotation(value, `${prefix}${key}.`, entries);
  });
  return entries;
};

const formatConfig = function (config: Config, format: Format): string {
  switch (format) {
    case 'json':
      return JSON.stringify(config, undefined, ' '.repeat(4));
    case 'yaml':
      return yaml.stringify(config, { indent: 4 });
    case 'env':
      return toEnv(config).join('\n');
    case 'properties':
    default:
      return toPropertiesNotation(config).join('\n');
  }
};

const showConfig = function (format: string = 'json'): void {
  const config = getConfig();
  printer.printBlock(formatConfig(config, format as Format));
};

export { showConfig };
