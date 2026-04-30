import { Request, Response } from 'express';
import { authService } from './auth.service';
import { AuthRequest } from '../../types';
import { sendSuccess, sendError } from '../../utils/response';
import { env } from '../../config/env.config';
import { logger } from '../../config/logger.config';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'strict' as const,
    path: '/',
};

export class AuthController {
    async login(req: Request, res: Response): Promise<void> {
        try {
            const { username, password } = req.body;
            const result = await authService.login(username, password);

            // Set tokens in httpOnly cookies
            res.cookie('access_token', result.accessToken, {
                ...COOKIE_OPTIONS,
                maxAge: 15 * 60 * 1000, // 15 minutes
            });

            res.cookie('refresh_token', result.refreshToken, {
                ...COOKIE_OPTIONS,
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                path: '/api/auth', // Only sent to auth endpoints
            });

            sendSuccess(res, { user: result.user }, 'Login successful');
        } catch (error: any) {
            logger.warn(`Login failed for "${req.body.username}": ${error.message}`);
            sendError(res, 'Invalid username or password', 401);
        }
    }

    async refresh(req: Request, res: Response): Promise<void> {
        try {
            const refreshToken = req.cookies?.refresh_token;
            if (!refreshToken) {
                sendError(res, 'No refresh token provided', 401);
                return;
            }

            const result = await authService.refresh(refreshToken);

            res.cookie('access_token', result.accessToken, {
                ...COOKIE_OPTIONS,
                maxAge: 15 * 60 * 1000,
            });

            res.cookie('refresh_token', result.refreshToken, {
                ...COOKIE_OPTIONS,
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/api/auth',
            });

            sendSuccess(res, { user: result.user }, 'Token refreshed');
        } catch (error: any) {
            logger.warn(`Token refresh failed: ${error.message}`);
            sendError(res, 'Invalid or expired refresh token', 401);
        }
    }

    async logout(req: Request, res: Response): Promise<void> {
        try {
            const refreshToken = req.cookies?.refresh_token;
            if (refreshToken) {
                await authService.logout(refreshToken);
            }

            res.clearCookie('access_token', COOKIE_OPTIONS);
            res.clearCookie('refresh_token', { ...COOKIE_OPTIONS, path: '/api/auth' });

            sendSuccess(res, null, 'Logged out successfully');
        } catch (error: any) {
            logger.error('Logout error:', error);
            sendError(res, 'Logout failed', 500);
        }
    }

    async me(req: AuthRequest, res: Response): Promise<void> {
        try {
            const user = await authService.getProfile(req.user!.userId);
            sendSuccess(res, user);
        } catch (error: any) {
            sendError(res, error.message, 404);
        }
    }

    async register(req: AuthRequest, res: Response): Promise<void> {
        try {
            const user = await authService.createUser(req.body);
            sendSuccess(res, user, 'User created successfully', 201);
        } catch (error: any) {
            if (error.code === 'P2002') {
                sendError(res, 'Username or email already exists', 409);
                return;
            }
            logger.error('Registration error:', error);
            sendError(res, 'Failed to create user', 500);
        }
    }
}

export const authController = new AuthController();
