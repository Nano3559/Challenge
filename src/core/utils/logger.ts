/* eslint-disable no-console */
import { env } from '../config/env';

type Level = 'debug' | 'info' | 'warn' | 'error';
const weight: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function log(level: Level, message: string, extra: unknown[]): void {
  if (weight[level] < weight[env.logLevel]) return;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)} ${message}`;
  (level === 'error' ? console.error : console.log)(line, ...extra);
}

export const logger = {
  debug: (m: string, ...e: unknown[]) => log('debug', m, e),
  info: (m: string, ...e: unknown[]) => log('info', m, e),
  warn: (m: string, ...e: unknown[]) => log('warn', m, e),
  error: (m: string, ...e: unknown[]) => log('error', m, e),
};
