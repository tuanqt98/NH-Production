import { Response } from 'express';
import { ngService } from './ng.service';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendError } from '../../utils/response';
import { logger } from '../../config/logger.config';

export class NgController {
    async createRange(req: AuthRequest, res: Response): Promise<void> {
        try {
            const range = await ngService.createRange(req.body);
            sendCreated(res, range, 'NG range recorded');
        } catch (error: any) {
            if (error.message === 'Operation not found') {
                sendError(res, error.message, 404);
                return;
            }
            logger.error('Create NG range error:', error);
            sendError(res, 'Failed to record NG range', 500);
        }
    }

    async checkNumber(req: AuthRequest, res: Response): Promise<void> {
        try {
            const number = parseInt(req.params.number as string);
            if (isNaN(number)) {
                sendError(res, 'Invalid number', 400);
                return;
            }
            const result = await ngService.checkNumber(number);
            sendSuccess(res, result);
        } catch (error: any) {
            logger.error('Check NG number error:', error);
            sendError(res, 'Failed to check number', 500);
        }
    }

    async findByOperation(req: AuthRequest, res: Response): Promise<void> {
        try {
            const operationId = parseInt(req.params.operationId as string);
            if (isNaN(operationId)) {
                sendError(res, 'Invalid operation ID', 400);
                return;
            }
            const result = await ngService.findByOperation(operationId);
            sendSuccess(res, result);
        } catch (error: any) {
            logger.error('Find NG ranges error:', error);
            sendError(res, 'Failed to retrieve NG ranges', 500);
        }
    }
}

export const ngController = new NgController();
