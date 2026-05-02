import { Response } from 'express';
import { ordersService } from './orders.service';
import { workflowService } from './workflow.service';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendError, sendNoContent } from '../../utils/response';
import { logger } from '../../config/logger.config';

export class OrdersController {
    async findAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const sortBy = (req.query.sortBy as string) || 'createdAt';
            const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

            const result = await ordersService.findAll({
                ...req.query,
                page,
                limit,
                sortBy,
                sortOrder,
            } as any);
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

    // ─── Workflow Methods ────────────────────────────────────────

    async workflowTransition(req: AuthRequest, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id as string);
            const action = req.params.action as string;
            const userId = req.user?.userId;
            if (isNaN(id) || !userId) {
                sendError(res, 'Invalid request', 400);
                return;
            }
            const result = await workflowService.transition(id, action, userId, req.body.note);
            sendSuccess(res, result, 'Chuyển trạng thái thành công');
        } catch (error: any) {
            logger.error('Workflow transition error:', error);
            sendError(res, error.message || 'Lỗi chuyển trạng thái', 400);
        }
    }

    async updateDesign(req: AuthRequest, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id as string);
            const userId = req.user?.userId;
            if (isNaN(id) || !userId) {
                sendError(res, 'Invalid request', 400);
                return;
            }
            const result = await workflowService.updateDesign(id, userId, req.body);
            sendSuccess(res, result, 'Cập nhật thiết kế thành công');
        } catch (error: any) {
            logger.error('Update design error:', error);
            sendError(res, error.message || 'Lỗi cập nhật thiết kế', 400);
        }
    }

    async updatePlanning(req: AuthRequest, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id as string);
            const userId = req.user?.userId;
            if (isNaN(id) || !userId) {
                sendError(res, 'Invalid request', 400);
                return;
            }
            const result = await workflowService.updatePlanning(id, userId, req.body);
            sendSuccess(res, result, 'Cập nhật kế hoạch thành công');
        } catch (error: any) {
            logger.error('Update planning error:', error);
            sendError(res, error.message || 'Lỗi cập nhật kế hoạch', 400);
        }
    }

    async getHistory(req: AuthRequest, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                sendError(res, 'Invalid order ID', 400);
                return;
            }
            const history = await workflowService.getHistory(id);
            sendSuccess(res, history);
        } catch (error: any) {
            logger.error('Get history error:', error);
            sendError(res, 'Failed to get history', 500);
        }
    }

    async getByDepartment(req: AuthRequest, res: Response): Promise<void> {
        try {
            const view = req.params.view as 'sales' | 'design' | 'planning' | 'production';
            if (!['sales', 'design', 'planning', 'production'].includes(view)) {
                sendError(res, 'Invalid department view', 400);
                return;
            }
            const orders = await workflowService.getOrdersByDepartment(view);
            
            // Log to verify data structure
            logger.info(`API getByDepartment(${view}) returned ${orders.length} orders`);
            
            res.status(200).json({
                success: true,
                data: orders
            });
        } catch (error: any) {
            logger.error('Get by department error:', error);
            sendError(res, 'Failed to get orders', 500);
        }
    }
}

export const ordersController = new OrdersController();
