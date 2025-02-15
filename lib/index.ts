#! /usr/bin/env node

import { Command } from 'commander';
import { description, version } from '../package.json';
import { start } from '@/command/start';
import { reload, restart, stop } from '@/command/control';
import { checkIntegrity } from '@/command/integrity';
import { createAdmin } from '@/command/admin';
import { showConfig } from '@/command/config';
import { loadConfig, setEnvPrefix } from '@/config/config';

loadConfig();

const program = new Command();

// define application
program
  .name('filescrud')
  .description(`${description}.\nMore Information: https://www.npmjs.com/package/files-crud`)
  .version(version)
  .option('-e, --env-prefix <prefix>', 'Prefix for environment variables', 'FILES_CRUD');

// define start subcommand
program
  .command('start')
  .description('Starts files-crud application.')
  .action(async () => {
    const startTime = Date.now();
    setEnvPrefix(program.optsWithGlobals().envPrefix);
    await start(startTime);
  });

// define stop subcommand
program
  .command('stop')
  .description('Stops files-crud application.')
  .action(async () => {
    setEnvPrefix(program.optsWithGlobals().envPrefix);
    await stop();
  });

// define restart subcommand
program
  .command('restart')
  .description('Restart files-crud application.')
  .action(async () => {
    setEnvPrefix(program.optsWithGlobals().envPrefix);
    await restart();
  });

// define reload subcommand
program
  .command('reload')
  .description('Reloads config ans some files-crud components based on changed config. Reloads components: Database, Storage, Logger')
  .action(async () => {
    setEnvPrefix(program.optsWithGlobals().envPrefix);
    await reload();
  });

// define integrityCheck subcommand
program
  .command('integrity')
  .description('Checks the integrity of all files, using their md5 checksums.')
  .argument('[path]', 'Path to the directory or file to check the integrity for. Storage root directory if not specified', '')
  .action(async (path) => {
    setEnvPrefix(program.optsWithGlobals().envPrefix);
    await checkIntegrity(path);
  });

// define admin subcommand
program
  .command('admin')
  .description('Creates an admin user.')
  .option('-u, --username <username>', 'Username of the user to create. Will be chosen randomly if not provided')
  .option('-p, --password <password>', 'Password of the user to create. Will be chosen randomly if not provided')
  .action(({ username, password }: { username?: string; password?: string }) => {
    setEnvPrefix(program.optsWithGlobals().envPrefix);
    createAdmin({ username, password }).then();
  });

// define config subcommand
program
  .command('config')
  .description('shows current configuration.')
  .argument('[format]', 'Format to show the config in (json|yaml|env|properties)', 'json')
  .option('-n, --no-defaults', 'Only show specified configuration, but no defaults')
  .action((format: string, { defaults }) => {
    setEnvPrefix(program.optsWithGlobals().envPrefix);
    showConfig(format, defaults as boolean);
  });

//parse and start
program.parse();
