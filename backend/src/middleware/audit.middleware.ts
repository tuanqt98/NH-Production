import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database.config';
import { auditLogger } from '../config/logger.config';

/**
 * Audit logging middleware
 * Logs all mutating requests (POST, PUT, DELETE, PATCH) to the audit_logs table
 * and to a separate audit log file for compliance.
 */
export function auditLog(entity: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        // Only audit mutating operations
        if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
            next();
            return;
        }

        const userId = req.user?.userId;
        if (!userId) {
            next();
            return;
        }

        // Capture the original json method to intercept response
        const originalJson = res.json.bind(res);

        res.json = function (body: any) {
            // Log after response is sent
            const action = getActionFromMethod(req.method);
            const entityId = parseInt(req.params.id as string) || body?.data?.id || 0;

            // Async audit log — don't block the response
            prisma.auditLog.create({
                data: {
                    userId,
                    action,
                    entity,
                    entityId,
                    oldData: undefined, // Could be populated with pre-change data if needed
                    newData: req.body,
                    ipAddress: req.ip || req.socket.remoteAddress,
                },
            }).catch(err => {
                auditLogger.error('Failed to write audit log to DB', { error: err.message });
            });

            // Also log to file
            auditLogger.info('Audit event', {
                userId,
                action,
                entity,
                entityId,
                ip: req.ip,
                method: req.method,
                path: req.originalUrl,
                statusCode: res.statusCode,
            });

            return originalJson(body);
        };

        next();
    };
}

function getActionFromMethod(method: string): string {
    switch (method) {
        case 'POST': return 'CREATE';
        case 'PUT':
        case 'PATCH': return 'UPDATE';
        case 'DELETE': return 'DELETE';
        default: return method;
    }
}
