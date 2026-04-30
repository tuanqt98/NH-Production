import { Request, Response } from 'express';
import { reportsService } from './reports.service';

export class ReportsController {
    async getProductionSummary(req: Request, res: Response) {
        try {
            const { startDate, endDate, groupBy } = req.query;
            const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 86400000);
            const end = endDate ? new Date(endDate as string) : new Date();
            end.setHours(23, 59, 59, 999);

            const data = await reportsService.getProductionSummary(
                start, end, (groupBy as any) || 'day'
            );
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getWorkerProductivity(req: Request, res: Response) {
        try {
            const { startDate, endDate } = req.query;
            const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 86400000);
            const end = endDate ? new Date(endDate as string) : new Date();
            end.setHours(23, 59, 59, 999);

            const data = await reportsService.getWorkerProductivity(start, end);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getOrderCompletion(req: Request, res: Response) {
        try {
            const data = await reportsService.getOrderCompletion();
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getNgAnalysis(req: Request, res: Response) {
        try {
            const { startDate, endDate } = req.query;
            const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 86400000);
            const end = endDate ? new Date(endDate as string) : new Date();
            end.setHours(23, 59, 59, 999);

            const data = await reportsService.getNgAnalysis(start, end);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getOEE(req: Request, res: Response) {
        try {
            const { startDate, endDate } = req.query;
            const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 86400000);
            const end = endDate ? new Date(endDate as string) : new Date();
            end.setHours(23, 59, 59, 999);

            const data = await reportsService.getOEE(start, end);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async exportExcel(req: Request, res: Response) {
        try {
            const { type, startDate, endDate } = req.query;
            const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 86400000);
            const end = endDate ? new Date(endDate as string) : new Date();
            end.setHours(23, 59, 59, 999);

            let data: any[];
            let sheetName: string;

            switch (type) {
                case 'production':
                    data = await reportsService.getProductionSummary(start, end, 'day');
                    sheetName = 'San Luong';
                    break;
                case 'workers':
                    data = await reportsService.getWorkerProductivity(start, end);
                    sheetName = 'Nang Suat';
                    break;
                case 'orders':
                    data = await reportsService.getOrderCompletion();
                    sheetName = 'Don Hang';
                    break;
                case 'ng':
                    const ngData = await reportsService.getNgAnalysis(start, end);
                    data = ngData.byOperation;
                    sheetName = 'Phan Tich NG';
                    break;
                default:
                    return res.status(400).json({ success: false, message: 'Invalid report type' });
            }

            // Use xlsx library
            const XLSX = await import('xlsx');
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=report_${type}_${start.toISOString().split('T')[0]}.xlsx`);
            res.send(buffer);
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
