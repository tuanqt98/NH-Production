import { prisma } from '../../config/database.config';
import { TransactionType } from '@prisma/client';

export class StockService {
    /**
     * Ghi nhận giao dịch kho và cập nhật tồn kho tức thì
     */
    async createTransaction(data: {
        materialId: number;
        type: TransactionType;
        quantity: number;
        orderId?: number;
        reason?: string;
        createdBy: number;
    }) {
        return prisma.$transaction(async (tx) => {
            // 1. Tạo bản ghi giao dịch
            const transaction = await tx.stockTransaction.create({
                data: {
                    materialId: data.materialId,
                    type: data.type,
                    quantity: data.quantity,
                    orderId: data.orderId,
                    reason: data.reason,
                    createdBy: data.createdBy,
                },
            });

            // 2. Cập nhật số lượng tồn kho trong bảng Material
            const adjustment = data.type === TransactionType.IN ? data.quantity : -data.quantity;

            const material = await tx.material.update({
                where: { id: data.materialId },
                data: {
                    currentStock: {
                        increment: adjustment,
                    },
                },
            });

            // 3. Nếu là xuất kho cho đơn hàng (OUT), cập nhật MaterialRequirement nếu có
            if (data.type === TransactionType.OUT && data.orderId) {
                await tx.materialRequirement.updateMany({
                    where: {
                        orderId: data.orderId,
                        materialId: data.materialId,
                    },
                    data: {
                        issuedQty: {
                            increment: data.quantity,
                        },
                    },
                });
            }

            return { transaction, currentStock: material.currentStock };
        });
    }

    async getHistory(query: { materialId?: number; type?: TransactionType; orderId?: number }) {
        return prisma.stockTransaction.findMany({
            where: {
                materialId: query.materialId,
                type: query.type,
                orderId: query.orderId,
            },
            include: {
                material: { select: { name: true, code: true, unit: true } },
                user: { select: { fullName: true } },
                order: { select: { orderCode: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }

    async getMaterialRequirements(orderId: number) {
        return prisma.materialRequirement.findMany({
            where: { orderId },
            include: {
                material: { select: { name: true, code: true, unit: true, currentStock: true } },
            },
        });
    }

    async addRequirement(orderId: number, materialId: number, requiredQty: number) {
        return prisma.materialRequirement.create({
            data: {
                orderId,
                materialId,
                requiredQty,
            },
        });
    }
}

export const stockService = new StockService();
