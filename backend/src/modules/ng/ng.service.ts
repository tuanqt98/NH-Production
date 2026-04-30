import { prisma } from '../../config/database.config';

export class NgService {
    /**
     * Insert NG range (range-based storage, not per-record)
     */
    async createRange(data: {
        operationId: number;
        rangeStart: number;
        rangeEnd: number;
        reason?: string;
    }) {
        // Verify operation exists
        const operation = await prisma.operation.findUnique({
            where: { id: data.operationId },
        });

        if (!operation) {
            throw new Error('Operation not found');
        }

        return prisma.ngRange.create({
            data: {
                operationId: data.operationId,
                rangeStart: data.rangeStart,
                rangeEnd: data.rangeEnd,
                reason: data.reason,
            },
        });
    }

    /**
     * Check if a specific number falls within any NG range.
     * Uses indexed columns (range_start, range_end) for efficient lookup.
     */
    async checkNumber(number: number) {
        const matches = await prisma.ngRange.findMany({
            where: {
                rangeStart: { lte: number },
                rangeEnd: { gte: number },
            },
            include: {
                operation: {
                    select: {
                        id: true,
                        name: true,
                        orderId: true,
                        order: { select: { orderCode: true } },
                    },
                },
            },
        });

        return {
            number,
            isNg: matches.length > 0,
            matches: matches.map(m => ({
                rangeId: m.id,
                rangeStart: m.rangeStart,
                rangeEnd: m.rangeEnd,
                reason: m.reason,
                operationId: m.operationId,
                operationName: m.operation.name,
                orderCode: m.operation.order?.orderCode,
            })),
        };
    }

    /**
     * Get all NG ranges for an operation
     */
    async findByOperation(operationId: number) {
        const ranges = await prisma.ngRange.findMany({
            where: { operationId },
            orderBy: { rangeStart: 'asc' },
        });

        const totalNgCount = ranges.reduce(
            (sum, r) => sum + (r.rangeEnd - r.rangeStart + 1),
            0
        );

        return {
            ranges,
            totalNgCount,
            rangeCount: ranges.length,
        };
    }
}

export const ngService = new NgService();
