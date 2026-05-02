import { Request, Response } from 'express';
import { customersService } from './customers.service';
import * as xlsx from 'xlsx';

export class CustomersController {
    async importExcel(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Vui lòng chọn file Excel' });
            }

            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawData: any[] = xlsx.utils.sheet_to_json(worksheet);

            // Hàm hỗ trợ tìm field trong row bất kể hoa thường/khoảng trắng
            const getVal = (row: any, keys: string[]) => {
                const rowKeys = Object.keys(row);
                for (const k of keys) {
                    const match = rowKeys.find(rk => rk.trim().toLowerCase() === k.toLowerCase());
                    if (match) return row[match];
                }
                return null;
            };

            const mappedData = rawData.map(row => ({
                email: getVal(row, ['Email', 'Địa chỉ email']),
                salesPerson: getVal(row, ['Nhân viên kD', 'Sale', 'Nhân viên']),
                address: getVal(row, ['Thành phố', 'Địa chỉ', 'City']),
                name: getVal(row, ['Tên đầy đủ', 'Họ và tên', 'Tên khách hàng', 'Name']),
                code: getVal(row, ['Mã khách hàng', 'Mã KH', 'Code'])
            })).filter(row => row.name);

            const result = await customersService.bulkImport(mappedData);

            res.json({ data: result });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async bulkDelete(req: Request, res: Response) {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: 'Vui lòng chọn khách hàng để xóa' });
            }
            await customersService.bulkDelete(ids);
            res.json({ message: `Đã xóa ${ids.length} khách hàng` });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAll(req: Request, res: Response) {
        try {
            const customers = await customersService.findAll();
            res.json({ data: customers });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async getOne(req: Request, res: Response) {
        try {
            const customer = await customersService.findOne(Number(req.params.id));
            if (!customer) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
            res.json({ data: customer });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const customer = await customersService.create(req.body);
            res.status(201).json({ data: customer });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const customer = await customersService.update(Number(req.params.id), req.body);
            res.json({ data: customer });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            await customersService.delete(Number(req.params.id));
            res.json({ message: 'Đã xóa khách hàng' });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async search(req: Request, res: Response) {
        try {
            const query = req.query.q as string;
            const customers = await customersService.search(query || '');
            res.json({ data: customers });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}
