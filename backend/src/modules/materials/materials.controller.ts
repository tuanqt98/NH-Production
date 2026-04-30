import { Response } from 'express';
import { materialsService } from './materials.service';
import { AuthRequest } from '../../types';

export class MaterialsController {
    async getAll(req: AuthRequest, res: Response) {
        try {
            const category = req.query.category as string | undefined;
            const search = req.query.search as string | undefined;
            const data = await materialsService.findAll({ category, search });
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getOne(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            const data = await materialsService.findById(id);
            if (!data) return res.status(404).json({ success: false, message: 'Material not found' });
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async create(req: AuthRequest, res: Response) {
        try {
            const data = await materialsService.create(req.body);
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            const data = await materialsService.update(id, req.body);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            await materialsService.delete(id);
            res.json({ success: true, message: 'Material deleted successfully' });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getAlerts(req: AuthRequest, res: Response) {
        try {
            const data = await materialsService.getStockAlerts();
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getCategories(req: AuthRequest, res: Response) {
        try {
            const data = await materialsService.getCategories();
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
