import { prisma } from '../../config/database.config';
import { Prisma, OrderStatus } from '@prisma/client';

export class OrdersService {
    /**
     * Get paginated list of orders with filters
     */
    async findAll(query: {
        page: number;
        limit: number;
        sortBy: string;
        sortOrder: 'asc' | 'desc';
        status?: string;
        customer?: string;
        search?: string;
        dateFrom?: string;
        dateTo?: string;
    }) {
        const where: Prisma.ProductionOrderWhereInput = {
            isDeleted: false,
        };

        if (query.status) {
            where.status = query.status as OrderStatus;
        }

        if (query.customer) {
            where.customer = { contains: query.customer, mode: 'insensitive' };
        }

        if (query.search) {
            where.OR = [
                { orderCode: { contains: query.search, mode: 'insensitive' } },
                { productCode: { contains: query.search, mode: 'insensitive' } },
                { customer: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        if (query.dateFrom || query.dateTo) {
            where.dueDate = {};
            if (query.dateFrom) where.dueDate.gte = new Date(query.dateFrom);
            if (query.dateTo) where.dueDate.lte = new Date(query.dateTo);
        }

        const [orders, total] = await Promise.all([
            prisma.productionOrder.findMany({
                where,
                include: {
                    operations: {
                        include: {
                            _count: { select: { productionLogs: true } },
                        },
                        orderBy: { sequence: 'asc' },
                    },
                },
                orderBy: { [query.sortBy]: query.sortOrder },
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
            prisma.productionOrder.count({ where }),
        ]);

        return {
            data: orders,
            meta: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(total / query.limit),
            },
        };
    }

    /**
     * Get single order with full details (operations + logs + NG ranges)
     */
    async findById(id: number) {
        const order = await prisma.productionOrder.findFirst({
            where: { id, isDeleted: false },
            include: {
                operations: {
                    orderBy: { sequence: 'asc' },
                    include: {
                        productionLogs: {
                            include: {
                                user: { select: { id: true, fullName: true, username: true } },
                            },
                            orderBy: { createdAt: 'desc' },
                        },
                        ngRanges: {
                            orderBy: { rangeStart: 'asc' },
                        },
                    },
                },
                materialRequirements: {
                    include: {
                        material: { select: { id: true, code: true, name: true, unit: true, currentStock: true } },
                    },
                    orderBy: { id: 'asc' },
                },
            },
        });

        if (!order) {
            throw new Error('Order not found');
        }

        // Auto-aggregate production data per operation
        const enriched = {
            ...order,
            operations: order.operations.map(op => {
                const totalOk = op.productionLogs.reduce((sum, l) => sum + l.okQty, 0);
                const totalNg = op.productionLogs.reduce((sum, l) => sum + l.ngQty, 0);
                const totalTime = op.productionLogs.reduce((sum, l) => {
                    return sum + (new Date(l.endTime).getTime() - new Date(l.startTime).getTime());
                }, 0);

                return {
                    ...op,
                    aggregate: {
                        totalOk,
                        totalNg,
                        totalQty: totalOk + totalNg,
                        ngRate: totalOk + totalNg > 0 ? ((totalNg / (totalOk + totalNg)) * 100).toFixed(2) : '0.00',
                        totalTimeMinutes: Math.round(totalTime / 60000),
                        logCount: op.productionLogs.length,
                    },
                };
            }),
        };

        return enriched;
    }

    /**
     * Create order with operations
     */
    async create(data: {
        orderCode: string;
        productCode: string;
        customer: string;
        plannedQty: number;
        dueDate: string;
        notes?: string;
        length?: number;
        width?: number;
        height?: number;
        specs?: any;
        operations: { name: string; sequence: number }[];
        materials?: { materialId: number; quantity: number }[];
    }) {
        return prisma.$transaction(async (tx) => {
            // 1. Tạo đơn hàng + công đoạn
            const order = await tx.productionOrder.create({
                data: {
                    orderCode: data.orderCode,
                    productCode: data.productCode,
                    customer: data.customer,
                    plannedQty: data.plannedQty,
                    dueDate: new Date(data.dueDate),
                    notes: data.notes,
                    length: data.length,
                    width: data.width,
                    height: data.height,
                    specs: data.specs,
                    status: OrderStatus.DRAFT,
                    operations: {
                        create: data.operations.map(op => ({
                            name: op.name,
                            sequence: op.sequence,
                        })),
                    },
                },
                include: {
                    operations: { orderBy: { sequence: 'asc' } },
                },
            });

            // 2. Tạo yêu cầu nguyên vật liệu nếu có
            if (data.materials && data.materials.length > 0) {
                await tx.materialRequirement.createMany({
                    data: data.materials.map(m => ({
                        orderId: order.id,
                        materialId: m.materialId,
                        requiredQty: m.quantity,
                    })),
                });
            }

            // 3. Trả về đơn đã tạo kèm material requirements
            return tx.productionOrder.findUnique({
                where: { id: order.id },
                include: {
                    operations: { orderBy: { sequence: 'asc' } },
                    materialRequirements: {
                        include: {
                            material: { select: { id: true, code: true, name: true, unit: true, currentStock: true } },
                        },
                    },
                },
            });
        });
    }

    /**
     * Update order (not operations)
     */
    async update(id: number, data: Partial<{
        productCode: string;
        customer: string;
        plannedQty: number;
        dueDate: string;
        status: OrderStatus;
        notes: string;
        length: number;
        width: number;
        height: number;
        specs: any;
        machineName: string;
        designNote: string;
        plannedStart: string;
        plannedEnd: string;
        planningNote: string;
    }>) {
        const existing = await prisma.productionOrder.findFirst({
            where: { id, isDeleted: false },
        });

        if (!existing) {
            throw new Error('Order not found');
        }

        const updateData: any = { ...data };
        if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
        if (data.plannedStart) updateData.plannedStart = new Date(data.plannedStart);
        if (data.plannedEnd) updateData.plannedEnd = new Date(data.plannedEnd);

        // Logic: Khi chuyển sang GOLD_ORDER, có thể trigger auto-create lệnh cho BP Kế hoạch
        if (data.status === OrderStatus.GOLD_ORDER && existing.status !== OrderStatus.GOLD_ORDER) {
            // Có thể thêm logic thông báo hoặc tạo task ở đây
        }

        return prisma.productionOrder.update({
            where: { id },
            data: updateData,
            include: {
                operations: { orderBy: { sequence: 'asc' } },
                materialRequirements: {
                    include: { material: true }
                }
            },
        });
    }

    /**
     * Soft delete order (admin only)
     */
    async delete(id: number) {
        const existing = await prisma.productionOrder.findFirst({
            where: { id, isDeleted: false },
        });

        if (!existing) {
            throw new Error('Order not found');
        }

        return prisma.productionOrder.update({
            where: { id },
            data: { isDeleted: true },
        });
    }
}

export const ordersService = new OrdersService();
