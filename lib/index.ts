#!/usr/bin/env node

import { program } from './cli';
import { printer } from '@/printing/printer';
import { Error } from 'mongoose';

program
  .parseAsync()
  .then()
  .catch((ex: unknown) => {
    printer.printError((ex as Error).message);
  });
