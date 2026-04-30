import { Response } from 'express';
import { ordersService } from './orders.service';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendError, sendNoContent } from '../../utils/response';
import { logger } from '../../config/logger.config';

export class OrdersController {
    async findAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const result = await ordersService.findAll(req.query as any);
            sendSuccess(res, result.data, 'Orders retrieved', 200, result.meta);
        } catch (error: any) {
            logger.error('Find orders error:', error);
            sendError(res, 'Failed to retrieve orders', 500);
        }
    }

    async findById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                sendError(res, 'Invalid order ID', 400);
                return;
            }
            const order = await ordersService.findById(id);
            sendSuccess(res, order);
        } catch (error: any) {
            if (error.message === 'Order not found') {
                sendError(res, error.message, 404);
                return;
            }
            logger.error('Find order error:', error);
            sendError(res, 'Failed to retrieve order', 500);
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const order = await ordersService.create(req.body);
            sendCreated(res, order, 'Order created successfully');
        } catch (error: any) {
            if (error.code === 'P2002') {
                sendError(res, 'Order code already exists', 409);
                return;
            }
            logger.error('Create order error:', error);
            sendError(res, 'Failed to create order', 500);
        }
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                sendError(res, 'Invalid order ID', 400);
                return;
            }
            const order = await ordersService.update(id, req.body);
            sendSuccess(res, order, 'Order updated successfully');
        } catch (error: any) {
            if (error.message === 'Order not found') {
                sendError(res, error.message, 404);
                return;
            }
            logger.error('Update order error:', error);
            sendError(res, 'Failed to update order', 500);
        }
    }

    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                sendError(res, 'Invalid order ID', 400);
                return;
            }
            await ordersService.delete(id);
            sendNoContent(res);
        } catch (error: any) {
            if (error.message === 'Order not found') {
                sendError(res, error.message, 404);
                return;
            }
            logger.error('Delete order error:', error);
            sendError(res, 'Failed to delete order', 500);
        }
    }
}

export const ordersController = new OrdersController();
