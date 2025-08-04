import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

// Helper function to serialize BigInt values
function replacer(key: string, value: any) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

// Helper function to safely stringify objects with BigInt
function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj, replacer, 2);
  } catch (error) {
    return `[Error serializing object: ${error}]`;
  }
}

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json({ replacer })
  ),
  defaultMeta: { service: 'alm-executor' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? safeStringify(meta) : ''}`;
        })
      )
    })
  ]
});

// Create logs directory if it doesn't exist
import { existsSync, mkdirSync } from 'fs';
if (!existsSync('logs')) {
  mkdirSync('logs');
}