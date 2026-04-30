import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config';
import { JwtPayload } from '../types';
import { logger } from '../config/logger.config';
// @ts-ignore
import cookie from 'cookie';

let io: Server;

export function initializeSocket(httpServer: HttpServer): Server {
    io = new Server(httpServer, {
        cors: {
            origin: env.FRONTEND_URL,
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });

    // Auth middleware — verify JWT from cookie
    io.use((socket: Socket, next) => {
        try {
            const cookies = cookie.parse(socket.handshake.headers.cookie || '');
            const token = cookies.access_token;

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
            (socket as any).user = decoded;
            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const user = (socket as any).user as JwtPayload;
        logger.info(`Socket connected: ${user.username} (${socket.id})`);

        // Auto-join dashboard room
        socket.join('dashboard');

        // Join specific order rooms
        socket.on('join:order', (orderId: number) => {
            socket.join(`order:${orderId}`);
            logger.debug(`${user.username} joined order:${orderId}`);
        });

        socket.on('leave:order', (orderId: number) => {
            socket.leave(`order:${orderId}`);
        });

        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${user.username} (${socket.id})`);
        });
    });

    logger.info('Socket.io initialized');
    return io;
}

export function getIO(): Server {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
}

/**
 * Emit production update to all relevant rooms
 */
export function emitProductionUpdate(orderId: number, data: any) {
    if (!io) return;
    io.to('dashboard').emit('dashboard:refresh', { timestamp: new Date() });
    io.to(`order:${orderId}`).emit('production:updated', data);
}

export function emitOrderStatusChange(orderId: number, status: string) {
    if (!io) return;
    io.to('dashboard').emit('order:statusChanged', { orderId, status });
    io.to(`order:${orderId}`).emit('order:statusChanged', { orderId, status });
}
