import pino, { type LoggerOptions } from 'pino';

const isDev = process.env['NODE_ENV'] !== 'production';

const options: LoggerOptions = {
  level: process.env['LOG_LEVEL'] ?? 'info',
  formatters: {
    level(label: string) {
      return { level: label };
    },
  },
  base: {
    service: 'airportfaster-api',
    env: process.env['NODE_ENV'] ?? 'development',
  },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'passwordHash'],
    censor: '[REDACTED]',
  },
};

if (isDev) {
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

export const logger = pino(options);

export default logger;
