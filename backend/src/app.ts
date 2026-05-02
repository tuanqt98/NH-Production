import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import { env } from './config/env.config';
import { logger } from './config/logger.config';
import { helmetConfig, corsConfig, generalRateLimiter } from './config/security.config';
import { initializeSocket } from './socket/socket';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import ordersRoutes from './modules/orders/orders.routes';
import logsRoutes from './modules/logs/logs.routes';
import ngRoutes from './modules/ng/ng.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import usersRoutes from './modules/users/users.routes';
import productsRoutes from './modules/products/products.routes';
import reportsRoutes from './modules/reports/reports.routes';
import materialsRoutes from './modules/materials/materials.routes';
import stockRoutes from './modules/stock/stock.routes';
import hrRoutes from './modules/hr/hr.routes';
import customersRoutes from './modules/customers/customers.routes';

// ─── Initialize Express ──────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Security Middleware ─────────────────────────────────────
app.use(helmetConfig);
app.use(corsConfig);
app.use(generalRateLimiter);

// ─── Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

// ─── Request Logging ─────────────────────────────────────────
app.use((req, res, next) => {
    if (req.path.startsWith('/uploads') || req.path === '/api/health') {
        return next();
    }
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
});

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: env.NODE_ENV,
    });
});

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/ng', ngRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/customers', customersRoutes);

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

// ─── Global Error Handler ────────────────────────────────────
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: env.isProd ? 'Internal server error' : err.message,
    });
});

// ─── Initialize Socket.io ────────────────────────────────────
initializeSocket(server);

// ─── Initialize Cron Jobs ────────────────────────────────────
import { initializeCron } from './config/cron.config';
initializeCron();

// ─── Start Server ────────────────────────────────────────────
server.listen(env.PORT, () => {
    logger.info(`🚀 Server running on port ${env.PORT} (${env.NODE_ENV})`);
    logger.info(`📡 Frontend URL: ${env.FRONTEND_URL}`);
    logger.info(`🔗 API Base: http://localhost:${env.PORT}/api`);
});

export default app;
