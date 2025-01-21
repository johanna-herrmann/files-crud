import yaml from 'yaml';
import { getConfig, getEnvPrefix, getFullConfig } from '@/config/config';
import { printer } from '@/printing/printer';
import Config from '@/types/config/Config';

type Format = 'json' | 'yaml' | 'env' | 'properties';

const toEnv = function (config: Config): string[] {
  const properties = toPropertiesNotation(config as Record<string, unknown>);
  return properties.map((property) => {
    const [key, value] = property.split('=');
    const envKey = `${getEnvPrefix()}_${key
      .replace(/\./g, '__')
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase()}`;
    return [envKey, value].join('=');
  });
};

const toPropertiesNotation = function (config: Record<string, unknown>, prefix = '', entries: string[] = []): string[] {
  Object.entries(config).forEach(([key, value]) => {
    if (typeof value === 'undefined' || value === null) {
      return;
    }
    if (key === 'directoryPermissions') {
      const keys = Object.keys(config.directoryPermissions ?? {});
      const values = Object.values(config.directoryPermissions ?? {});
      entries.push(`${prefix}${key}.directories=${keys.join(',')}`);
      entries.push(`${prefix}${key}.permissions=${values.join(',')}`);
      return;
    }
    if (typeof value === 'object' && 'push' in value) {
      return entries.push(`${prefix}${key}=${(value as []).join(',')}`);
    }
    if (typeof value !== 'object') {
      return entries.push(`${prefix}${key}=${value}`);
    }
    return toPropertiesNotation(value as Record<string, unknown>, `${prefix}${key}.`, entries);
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
      return toPropertiesNotation(config as Record<string, unknown>).join('\n');
  }
};

const showConfig = function (format: string = 'json', defaults: boolean): void {
  const config = defaults ? getFullConfig() : getConfig();
  printer.printBlock(formatConfig(config, format as Format));
};

export { showConfig };
