import { PrismaClient } from '@prisma/client';
import { logger } from './logger.config';

const prisma = new PrismaClient({
    log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
    ],
});

// Log slow queries in development
prisma.$on('query', (e) => {
    if (e.duration > 500) {
        logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
    }
});

export { prisma };
