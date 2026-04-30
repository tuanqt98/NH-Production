import winston from 'winston';
import { env } from './env.config';

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
);

export const logger = winston.createLogger({
    level: env.isDev ? 'debug' : 'info',
    format: logFormat,
    defaultMeta: { service: 'nh-production' },
    transports: [
        // Console output (dev-friendly format)
        new winston.transports.Console({
            format: consoleFormat,
        }),
        // File output for production
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 10 * 1024 * 1024,
            maxFiles: 10,
        }),
    ],
});

// Separate audit logger
export const auditLogger = winston.createLogger({
    level: 'info',
    format: logFormat,
    defaultMeta: { service: 'nh-audit' },
    transports: [
        new winston.transports.File({
            filename: 'logs/audit.log',
            maxsize: 50 * 1024 * 1024, // 50MB for audit trails
            maxFiles: 20,
        }),
    ],
});
