/**
 * Pino logger factory with correlation ID support
 */

import pino, { Logger as PinoLogger } from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export function createLogger(serviceName: string): PinoLogger {
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: isProduction
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: false,
            translateTime: 'SYS:standard',
          },
        },
    base: {
      service: serviceName,
      environment: process.env.NODE_ENV || 'development',
    },
  });
}

export type Logger = PinoLogger;
