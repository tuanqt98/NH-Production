import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config';
import { AuthRequest, JwtPayload } from '../types';
import { sendError } from '../utils/response';
import { logger } from '../config/logger.config';

/**
 * Authentication middleware
 * Extracts JWT from httpOnly cookie and verifies it.
 * Attaches decoded user payload to req.user.
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
    try {
        const token = req.cookies?.access_token;

        if (!token) {
            sendError(res, 'Authentication required. Please login.', 401);
            return;
        }

        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
        req.user = decoded;
        next();
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            sendError(res, 'Token expired. Please refresh your session.', 401);
            return;
        }
        if (error.name === 'JsonWebTokenError') {
            sendError(res, 'Invalid token. Please login again.', 401);
            return;
        }
        logger.error('Auth middleware error:', error);
        sendError(res, 'Authentication failed.', 401);
    }
}
