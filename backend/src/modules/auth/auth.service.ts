import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/database.config';
import { env } from '../../config/env.config';
import { JwtPayload } from '../../types';
import { logger } from '../../config/logger.config';

const SALT_ROUNDS = 12;

export class AuthService {
    /**
     * Authenticate user and return tokens
     */
    async login(username: string, password: string) {
        const user = await prisma.user.findUnique({
            where: { username },
            include: { role: true },
        });

        if (!user || !user.isActive) {
            throw new Error('Invalid credentials');
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }

        // Generate tokens
        const payload: JwtPayload = {
            userId: user.id,
            username: user.username,
            role: user.role.name,
            permissions: user.role.permissions as string[],
        };

        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken();

        // Store refresh token hash in DB
        const tokenHash = this.hashToken(refreshToken);
        await prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
        });

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        logger.info(`User logged in: ${user.username}`);

        return {
            accessToken,
            refreshToken,
            user: this.sanitizeUser(user),
        };
    }

    /**
     * Refresh access token using refresh token
     */
    async refresh(refreshToken: string) {
        const tokenHash = this.hashToken(refreshToken);

        const storedToken = await prisma.refreshToken.findFirst({
            where: {
                tokenHash,
                revoked: false,
                expiresAt: { gt: new Date() },
            },
            include: {
                user: { include: { role: true } },
            },
        });

        if (!storedToken) {
            throw new Error('Invalid or expired refresh token');
        }

        // Revoke old token (rotation)
        await prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revoked: true },
        });

        const user = storedToken.user;
        const payload: JwtPayload = {
            userId: user.id,
            username: user.username,
            role: user.role.name,
            permissions: user.role.permissions as string[],
        };

        // Issue new tokens
        const newAccessToken = this.generateAccessToken(payload);
        const newRefreshToken = this.generateRefreshToken();

        await prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: this.hashToken(newRefreshToken),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            user: this.sanitizeUser(user),
        };
    }

    /**
     * Revoke refresh token on logout
     */
    async logout(refreshToken: string) {
        const tokenHash = this.hashToken(refreshToken);
        await prisma.refreshToken.updateMany({
            where: { tokenHash },
            data: { revoked: true },
        });
    }

    /**
     * Get current user profile
     */
    async getProfile(userId: number) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        });

        if (!user) {
            throw new Error('User not found');
        }

        return this.sanitizeUser(user);
    }

    /**
     * Create a new user (admin only)
     */
    async createUser(data: {
        username: string;
        email: string;
        password: string;
        fullName: string;
        roleId: number;
    }) {
        const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

        const user = await prisma.user.create({
            data: {
                username: data.username,
                email: data.email,
                passwordHash,
                fullName: data.fullName,
                roleId: data.roleId,
            },
            include: { role: true },
        });

        return this.sanitizeUser(user);
    }

    // ─── Private helpers ───────────────────────────────────────

    private generateAccessToken(payload: JwtPayload): string {
        return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
            expiresIn: env.JWT_ACCESS_EXPIRY,
        } as jwt.SignOptions);
    }

    private generateRefreshToken(): string {
        return crypto.randomBytes(64).toString('hex');
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Remove sensitive fields from user object
     */
    private sanitizeUser(user: any) {
        const { passwordHash, ...safe } = user;
        return safe;
    }
}

export const authService = new AuthService();
