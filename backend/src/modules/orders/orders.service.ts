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
                    materialRequirements: { select: { id: true } },
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

    async create(data: {
        orderCode: string;
        productCode: string;
        productName?: string;
        customer: string;
        plannedQty: number;
        dueDate: string;
        salesAccountant?: string;
        bomType?: string;
        machineTarget?: string;
        length?: number;
        width?: number;
        height?: number;
        printColors?: number;
        stepDistance?: number;
        numItemsPerSet?: number;
        packingMethod?: string;
        unitPerPack?: number;
        unitName?: string;
        packingSpecs?: string;
        wastePercent?: number;
        status?: string;
        notes?: string;
        operations: { name: string; sequence: number }[];
        materials?: { materialId: number; quantity: number }[];
    }) {
        return prisma.$transaction(async (tx) => {
            const order = await tx.productionOrder.create({
                data: {
                    orderCode: data.orderCode,
                    productCode: data.productCode,
                    productName: data.productName || null,
                    customer: data.customer,
                    plannedQty: data.plannedQty,
                    dueDate: new Date(data.dueDate),
                    salesAccountant: data.salesAccountant,
                    bomType: data.bomType,
                    machineTarget: data.machineTarget,
                    length: data.length,
                    width: data.width,
                    height: data.height,
                    printColors: data.printColors,
                    stepDistance: data.stepDistance,
                    numItemsPerSet: data.numItemsPerSet,
                    packingMethod: data.packingMethod,
                    unitPerPack: data.unitPerPack,
                    unitName: data.unitName,
                    packingSpecs: data.packingSpecs,
                    wastePercent: data.wastePercent || 0,
                    notes: data.notes,
                    status: (data.status || 'QUOTATION') as any,
                },
            });

            // 2. Add default operations if none provided
            const ops = data.operations && data.operations.length > 0
                ? data.operations
                : [
                    { name: 'In', sequence: 1 },
                    { name: 'Bế', sequence: 2 },
                    { name: 'Thành phẩm', sequence: 3 }
                ];

            await tx.operation.createMany({
                data: ops.map((op: any) => ({
                    orderId: order.id,
                    name: op.name,
                    sequence: op.sequence,
                    status: 'WAITING',
                })),
            });

            if (data.materials && data.materials.length > 0) {
                await tx.materialRequirement.createMany({
                    data: data.materials.map(m => ({
                        orderId: order.id,
                        materialId: m.materialId,
                        requiredQty: m.quantity,
                    })),
                });
            }

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

    async update(id: number, data: any) {
        return prisma.$transaction(async (tx) => {
            const existing = await tx.productionOrder.findFirst({
                where: { id, isDeleted: false },
            });

            if (!existing) {
                throw new Error('Order not found');
            }

            // Whitelist: only allow specific fields to prevent injection
            const ALLOWED_FIELDS = [
                'productCode', 'productName', 'customer', 'plannedQty',
                'dueDate', 'salesAccountant', 'bomType', 'machineTarget',
                'length', 'width', 'height', 'printColors', 'stepDistance',
                'numItemsPerSet', 'packingMethod', 'unitPerPack', 'unitName',
                'packingSpecs', 'wastePercent', 'mainMatUsage', 'subMatUsage',
                'totalMaterialCost', 'notes', 'status', 'plannedStart', 'plannedEnd',
                'designMachine', 'designNote', 'planningNote',
            ];
            const updateData: any = {};
            for (const key of ALLOWED_FIELDS) {
                if (data[key] !== undefined) updateData[key] = data[key];
            }
            if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);
            if (updateData.plannedStart) updateData.plannedStart = new Date(updateData.plannedStart);
            if (updateData.plannedEnd) updateData.plannedEnd = new Date(updateData.plannedEnd);

            // Handle Operations update if provided
            if (data.operations) {
                // Simplest way: delete all and recreate
                await tx.operation.deleteMany({ where: { orderId: id } });
                updateData.operations = {
                    create: data.operations.map((op: any) => ({
                        name: op.name,
                        sequence: op.sequence,
                    })),
                };
            } else {
                delete updateData.operations;
            }

            // Handle Materials update if provided
            if (data.materials) {
                await tx.materialRequirement.deleteMany({ where: { orderId: id } });
                // We'll create them after the update to have the order ID context (though it's same ID)
            }
            delete updateData.materials;
            delete updateData.materialRequirements;

            const updated = await tx.productionOrder.update({
                where: { id },
                data: updateData,
                include: {
                    operations: { orderBy: { sequence: 'asc' } },
                },
            });

            if (data.materials && data.materials.length > 0) {
                await tx.materialRequirement.createMany({
                    data: data.materials.map((m: any) => ({
                        orderId: id,
                        materialId: m.materialId,
                        requiredQty: m.quantity,
                    })),
                });
            }

            return tx.productionOrder.findUnique({
                where: { id },
                include: {
                    operations: { orderBy: { sequence: 'asc' } },
                    materialRequirements: {
                        include: { material: true }
                    }
                },
            });
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
