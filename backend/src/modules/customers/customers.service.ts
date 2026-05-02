import { prisma } from '../../config/database.config';

const ALLOWED_FIELDS = ['name', 'code', 'taxCode', 'phone', 'email', 'address', 'website', 'salesPerson', 'paymentTerms', 'isCompany', 'notes'];

function sanitize(data: any): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const key of ALLOWED_FIELDS) {
        if (data[key] !== undefined) clean[key] = data[key];
    }
    return clean;
}

export class CustomersService {
    async findAll() {
        return prisma.customer.findMany({
            orderBy: { name: 'asc' }
        });
    }

    async findOne(id: number) {
        return prisma.customer.findUnique({
            where: { id }
        });
    }

    async create(data: any) {
        const clean = sanitize(data);

        // Auto-generate code: find max existing code to avoid race condition
        if (!clean.code) {
            const last = await prisma.customer.findFirst({
                orderBy: { id: 'desc' },
                select: { id: true }
            });
            const nextId = (last?.id || 0) + 1;
            clean.code = `KH-${nextId.toString().padStart(4, '0')}`;
        }

        return prisma.customer.create({ data: clean as any });
    }

    async update(id: number, data: any) {
        const clean = sanitize(data);
        return prisma.customer.update({
            where: { id },
            data: clean
        });
    }

    async delete(id: number) {
        return prisma.customer.delete({
            where: { id }
        });
    }

    async search(query: string) {
        return prisma.customer.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { code: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 10,
            orderBy: { name: 'asc' }
        });
    }
    async bulkImport(rows: any[]) {
        const results = { imported: 0, skipped: 0, errors: [] as string[] };

        for (const row of rows) {
            try {
                // Kiểm tra mã KH đã tồn tại chưa
                if (row.code) {
                    const existing = await prisma.customer.findUnique({ where: { code: row.code } });
                    if (existing) {
                        results.skipped++;
                        continue;
                    }
                }

                // Auto-generate code nếu chưa có
                if (!row.code) {
                    const last = await prisma.customer.findFirst({
                        orderBy: { id: 'desc' },
                        select: { id: true }
                    });
                    row.code = `KH-${((last?.id || 0) + 1 + results.imported).toString().padStart(4, '0')}`;
                }

                await prisma.customer.create({
                    data: {
                        code: row.code,
                        name: row.name,
                        email: row.email || null,
                        address: row.address || null,
                        salesPerson: row.salesPerson || null,
                        notes: row.notes || null,
                        phone: row.phone || null,
                        isCompany: true,
                    }
                });
                results.imported++;
            } catch (err: any) {
                results.errors.push(`Dòng "${row.name || row.code}": ${err.message}`);
            }
        }

        return results;
    }

    async bulkDelete(ids: number[]) {
        return prisma.customer.deleteMany({
            where: { id: { in: ids } }
        });
    }
}

export const customersService = new CustomersService();
