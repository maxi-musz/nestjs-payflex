import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as colors from 'colors';

@Injectable()
export class CustomLogger implements NestLoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    const ctx = context || this.context || 'Application';
    console.log(colors.cyan(`[${ctx}] ${message}`));
  }

  error(message: any, trace?: string, context?: string) {
    const ctx = context || this.context || 'Application';
    console.error(colors.red(`[${ctx}] ${message}`));
    if (trace) {
      console.error(colors.red(`[${ctx}] Stack: ${trace}`));
    }
  }

  warn(message: any, context?: string) {
    const ctx = context || this.context || 'Application';
    console.warn(colors.yellow(`[${ctx}] ${message}`));
  }

  debug(message: any, context?: string) {
    const ctx = context || this.context || 'Application';
    if (process.env.NODE_ENV === 'development') {
      console.log(colors.magenta(`[${ctx}] ${message}`));
    }
  }

  verbose(message: any, context?: string) {
    const ctx = context || this.context || 'Application';
    if (process.env.NODE_ENV === 'development') {
      console.log(colors.gray(`[${ctx}] ${message}`));
    }
  }
}

