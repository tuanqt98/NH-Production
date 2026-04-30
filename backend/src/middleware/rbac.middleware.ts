import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { sendError } from '../utils/response';

/**
 * RBAC Middleware Factory
 * Returns middleware that checks if the authenticated user's role
 * is in the allowed list.
 * 
 * Usage: authorize('admin', 'manager')
 * 
 * Role hierarchy:
 *   - admin:   Full access (all CRUD + user management)
 *   - manager: Read + write (no user management, no delete)
 *   - worker:  Read own data + create production logs only
 */
export function authorize(...allowedRoles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            sendError(res, 'Authentication required.', 401);
            return;
        }

        const userRole = req.user.role.toLowerCase();

        if (!allowedRoles.includes(userRole)) {
            sendError(
                res,
                `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${userRole}`,
                403
            );
            return;
        }

        next();
    };
}
