#! /usr/bin/env node

import { Command } from 'commander';
import { description, version } from '../package.json';
import { start } from '@/command/start';
import { checkIntegrity } from '@/command/integrity';
import { createAdmin, createInitialAdminIfNoAdminExists } from '@/command/admin';

const program = new Command();

// define application
program.name('filescrud').description(`${description}.\nMore Information: https://www.npmjs.com/package/files-crud`).version(version);

// define start subcommand
program
  .command('start')
  .description('Starts files-crud application.')
  .action(() => {
    const startTime = Date.now();
    createInitialAdminIfNoAdminExists().then(() => {
      start(startTime);
    });
  });

// define integrityCheck subcommand
program
  .command('integrity')
  .description('Checks the integrity of all files, using their md5 checksums.')
  .argument('[path]', 'Path to the directory or file to check the integrity for. Storage root directory if not specified')
  .action((path) => {
    checkIntegrity(path ?? '').then();
  });

// define admin subcommand
program
  .command('admin')
  .description('Creates an admin user.')
  .option('-u, --username <username>', 'Username of the user to create. Will be chosen randomly if not provided')
  .option('-p, --password <password>', 'Password of the user to create. Will be chosen randomly if not provided')
  .action(({ username, password }: { username?: string; password?: string }) => {
    createAdmin({ username, password }).then();
  });

//parse and start
program.parse();
