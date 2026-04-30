import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProductsService {
    async getAllProducts() {
        return prisma.product.findMany({
            include: {
                templates: true,
            },
            orderBy: { code: 'asc' },
        });
    }

    async getProductById(id: number) {
        return prisma.product.findUnique({
            where: { id },
            include: { templates: true },
        });
    }

    async createProduct(data: any) {
        const { templates, ...productData } = data;
        return prisma.product.create({
            data: {
                ...productData,
                templates: {
                    create: templates || [],
                },
            },
            include: { templates: true },
        });
    }

    async updateProduct(id: number, data: any) {
        const { templates, ...productData } = data;

        // Handle template updates (simplified: delete all and recreate)
        if (templates) {
            await prisma.operationTemplate.deleteMany({
                where: { productId: id },
            });
        }

        return prisma.product.update({
            where: { id },
            data: {
                ...productData,
                templates: templates ? {
                    create: templates,
                } : undefined,
            },
            include: { templates: true },
        });
    }

    async deleteProduct(id: number) {
        return prisma.product.delete({
            where: { id },
        });
    }

    async getTemplatesByProduct(productId: number) {
        return prisma.operationTemplate.findMany({
            where: { productId },
            orderBy: { sequence: 'asc' },
        });
    }
}
