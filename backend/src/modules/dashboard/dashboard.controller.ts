import { Response } from 'express';
import { dashboardService } from './dashboard.service';
import { AuthRequest } from '../../types';
import { sendSuccess, sendError } from '../../utils/response';
import { logger } from '../../config/logger.config';

export class DashboardController {
    async getSummary(req: AuthRequest, res: Response): Promise<void> {
        try {
            const summary = await dashboardService.getSummary();
            sendSuccess(res, summary);
        } catch (error: any) {
            logger.error('Dashboard summary error:', error);
            sendError(res, 'Failed to load dashboard summary', 500);
        }
    }

    async getDailyOutput(req: AuthRequest, res: Response): Promise<void> {
        try {
            const days = parseInt(req.query.days as string) || 30;
            const data = await dashboardService.getDailyOutput(days);
            sendSuccess(res, data);
        } catch (error: any) {
            logger.error('Daily output error:', error);
            sendError(res, 'Failed to load daily output', 500);
        }
    }

    async getOverdue(req: AuthRequest, res: Response): Promise<void> {
        try {
            const data = await dashboardService.getOverdue();
            sendSuccess(res, data);
        } catch (error: any) {
            logger.error('Overdue orders error:', error);
            sendError(res, 'Failed to load overdue orders', 500);
        }
    }

    async getBottleneck(req: AuthRequest, res: Response): Promise<void> {
        try {
            const data = await dashboardService.getBottleneck();
            sendSuccess(res, data);
        } catch (error: any) {
            logger.error('Bottleneck error:', error);
            sendError(res, 'Failed to load bottleneck data', 500);
        }
    }

    async getNgRate(req: AuthRequest, res: Response): Promise<void> {
        try {
            const data = await dashboardService.getNgRate();
            sendSuccess(res, data);
        } catch (error: any) {
            logger.error('NG rate error:', error);
            sendError(res, 'Failed to load NG rate data', 500);
        }
    }
}

export const dashboardController = new DashboardController();
