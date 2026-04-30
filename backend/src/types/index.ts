import { Request } from 'express';

export interface JwtPayload {
    userId: number;
    username: string;
    role: string;
    permissions: string[];
}

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    meta?: PaginationMeta;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface PaginationQuery {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface DashboardSummary {
    totalOrders: number;
    completedOrders: number;
    inProgressOrders: number;
    overdueOrders: number;
    todayOkQty: number;
    todayNgQty: number;
    ngRate: number;
}

export interface DailyOutput {
    date: string;
    okQty: number;
    ngQty: number;
}

export interface BottleneckData {
    operationName: string;
    avgDuration: number;
    totalLogs: number;
    totalNg: number;
}
