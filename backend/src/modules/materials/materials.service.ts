import { prisma } from '../../config/database.config';
import { Prisma } from '@prisma/client';

export class MaterialsService {
    async findAll(query: { category?: string; search?: string }) {
        const where: Prisma.MaterialWhereInput = {};

        if (query.category) {
            where.category = query.category;
        }

        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { code: { contains: query.search, mode: 'insensitive' } },
                { supplier: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        return prisma.material.findMany({
            where,
            orderBy: { code: 'asc' },
        });
    }

    async findById(id: number) {
        return prisma.material.findUnique({
            where: { id },
            include: {
                transactions: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { fullName: true } } },
                },
            },
        });
    }

    async create(data: Prisma.MaterialCreateInput) {
        return prisma.material.create({ data });
    }

    async update(id: number, data: Prisma.MaterialUpdateInput) {
        return prisma.material.update({
            where: { id },
            data,
        });
    }

    async delete(id: number) {
        return prisma.material.delete({
            where: { id },
        });
    }

    /**
     * Lấy danh sách vật tư có tồn kho dưới mức tối thiểu
     * Sử dụng raw SQL vì Prisma không hỗ trợ so sánh giữa 2 cột
     */
    async getStockAlerts() {
        return prisma.$queryRaw`
            SELECT * FROM materials 
            WHERE current_stock <= min_stock 
            ORDER BY current_stock ASC
        `;
    }

    async getCategories() {
        const categories = await prisma.material.findMany({
            select: { category: true },
            distinct: ['category'],
        });
        return categories.map((c: { category: string }) => c.category);
    }
}

export const materialsService = new MaterialsService();
