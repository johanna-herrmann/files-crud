import fs from 'fs';
import { printer } from '@/printing/printer';
import { doFetch } from './fetchWrapper';
import { start } from './start';
import { getConfig, NEW_CONFIG_FILE_PATH } from '@/config/config';

const getPropertiesString = function () {
  try {
    return fs.readFileSync('./.control.json', 'utf-8') || '{}';
  } catch {
    return '{}';
  }
};

const getControlProperties = function () {
  const propertiesString = getPropertiesString();
  const { port, protocol, token } = JSON.parse(propertiesString) as Record<string, string>;
  return { port, protocol, token };
};

const doRequest = async function (action: 'stop' | 'reload', port?: string, protocol?: string, token?: string): Promise<boolean> {
  try {
    const res = await doFetch(`${protocol ?? 'http'}://127.0.0.1:${port ?? 9000}/control/${action}`, {
      method: 'POST',
      headers: { Authorization: token ?? 'token' }
    });
    if (res.status !== 200) {
      printer.printError(`Request failed with error. StatusCode: ${res.status}`);
      return false;
    }
    return true;
  } catch {
    printer.printError('Request failed. Application not running?');
    return false;
  }
};

const stop = async function (): Promise<boolean> {
  printer.printLine('Sending request to stop...');
  const { port, protocol, token } = getControlProperties();
  const success = await doRequest('stop', port, protocol, token);
  if (success) {
    printer.printLine('Stopped.');
    return true;
  }
  return false;
};

const reload = async function (): Promise<void> {
  printer.printLine('Preparing to reload...');
  const config = getConfig();
  fs.writeFileSync(NEW_CONFIG_FILE_PATH, JSON.stringify(config), 'utf8');
  printer.printLine('Sending request to reload...');
  const { port, protocol, token } = getControlProperties();
  const success = await doRequest('reload', port, protocol, token);
  if (success) {
    printer.printLine('Reloaded.');
  }
};

const restart = async function () {
  const stopped = await stop();
  if (!stopped) {
    return;
  }
  printer.printLine('Starting...');
  await start(Date.now());
};

export { stop, reload, restart, doFetch, getControlProperties };
