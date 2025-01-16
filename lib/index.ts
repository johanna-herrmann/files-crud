#! /usr/bin/env node

import { Command } from 'commander';
import { description, version } from '../package.json';
import { start } from '@/command/start';
import { checkIntegrity } from '@/command/integrity';
import { createAdmin, createInitialAdminIfNoAdminExists } from '@/command/admin';
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
  .action(() => {
    const startTime = Date.now();
    setEnvPrefix(program.optsWithGlobals().envPrefix);
    createInitialAdminIfNoAdminExists().then(() => {
      start(startTime);
    });
  });

// define integrityCheck subcommand
program
  .command('integrity')
  .description('Checks the integrity of all files, using their md5 checksums.')
  .argument('[path]', 'Path to the directory or file to check the integrity for. Storage root directory if not specified', '')
  .action((path) => {
    setEnvPrefix(program.optsWithGlobals().envPrefix);
    checkIntegrity(path).then();
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
  .description('shows currently configuration.')
  .argument('[format]', 'Format to show the config in (json|yaml)', 'properties')
  .option('-n, --no-defaults', 'Only show specified configuration, but no defaults')
  .action((format: string, { defaults }) => {
    setEnvPrefix(program.optsWithGlobals().envPrefix);
    showConfig(format, !(defaults as boolean));
  });

//parse and start
program.parse();
