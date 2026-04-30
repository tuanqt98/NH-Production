import { Response } from 'express';
import { stockService } from './stock.service';
import { AuthRequest } from '../../types';

export class StockController {
    async createTransaction(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.userId;
            const data = await stockService.createTransaction({
                ...req.body,
                createdBy: userId,
            });
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getHistory(req: AuthRequest, res: Response) {
        try {
            const { materialId, type, orderId } = req.query;
            const data = await stockService.getHistory({
                materialId: materialId ? parseInt(materialId as string) : undefined,
                type: type as any,
                orderId: orderId ? parseInt(orderId as string) : undefined,
            });
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getRequirements(req: AuthRequest, res: Response) {
        try {
            const orderId = parseInt(req.params.orderId as string);
            const data = await stockService.getMaterialRequirements(orderId);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async addRequirement(req: AuthRequest, res: Response) {
        try {
            const { orderId, materialId, requiredQty } = req.body;
            const data = await stockService.addRequirement(orderId, materialId, requiredQty);
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}
