import { prisma } from '../../config/database.config';

export class ReportsService {
    /**
     * Tổng sản lượng theo khoảng thời gian (daily/weekly/monthly)
     */
    async getProductionSummary(startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day') {
        const logs = await prisma.productionLog.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
            },
            select: {
                okQty: true,
                ngQty: true,
                startTime: true,
                endTime: true,
                createdAt: true,
                operation: {
                    select: { name: true, order: { select: { orderCode: true, productCode: true } } },
                },
            },
        });

        const grouped = new Map<string, { okQty: number; ngQty: number; totalHours: number; logCount: number }>();

        for (const log of logs) {
            const key = this.getGroupKey(log.createdAt, groupBy);
            const existing = grouped.get(key) || { okQty: 0, ngQty: 0, totalHours: 0, logCount: 0 };
            existing.okQty += log.okQty;
            existing.ngQty += log.ngQty;
            existing.totalHours += (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 3600000;
            existing.logCount += 1;
            grouped.set(key, existing);
        }

        return Array.from(grouped.entries())
            .map(([period, data]) => ({
                period,
                okQty: data.okQty,
                ngQty: data.ngQty,
                totalQty: data.okQty + data.ngQty,
                totalHours: Math.round(data.totalHours * 100) / 100,
                ngRate: data.okQty + data.ngQty > 0
                    ? ((data.ngQty / (data.okQty + data.ngQty)) * 100).toFixed(2)
                    : '0.00',
                productivity: data.totalHours > 0
                    ? Math.round(data.okQty / data.totalHours)
                    : 0,
                logCount: data.logCount,
            }))
            .sort((a, b) => a.period.localeCompare(b.period));
    }

    /**
     * Năng suất từng công nhân
     */
    async getWorkerProductivity(startDate: Date, endDate: Date) {
        const logs = await prisma.productionLog.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
            },
            include: {
                user: { select: { id: true, username: true, fullName: true } },
                operation: { select: { name: true } },
            },
        });

        const workerMap = new Map<number, {
            user: { id: number; username: string; fullName: string };
            okQty: number;
            ngQty: number;
            totalHours: number;
            logCount: number;
            operations: Set<string>;
        }>();

        for (const log of logs) {
            const existing = workerMap.get(log.userId) || {
                user: log.user,
                okQty: 0,
                ngQty: 0,
                totalHours: 0,
                logCount: 0,
                operations: new Set<string>(),
            };
            existing.okQty += log.okQty;
            existing.ngQty += log.ngQty;
            existing.totalHours += (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 3600000;
            existing.logCount += 1;
            existing.operations.add(log.operation.name);
            workerMap.set(log.userId, existing);
        }

        return Array.from(workerMap.values())
            .map(data => ({
                userId: data.user.id,
                username: data.user.username,
                fullName: data.user.fullName,
                okQty: data.okQty,
                ngQty: data.ngQty,
                totalQty: data.okQty + data.ngQty,
                totalHours: Math.round(data.totalHours * 100) / 100,
                productivityPerHour: data.totalHours > 0
                    ? Math.round(data.okQty / data.totalHours)
                    : 0,
                ngRate: data.okQty + data.ngQty > 0
                    ? ((data.ngQty / (data.okQty + data.ngQty)) * 100).toFixed(2)
                    : '0.00',
                logCount: data.logCount,
                operations: Array.from(data.operations),
            }))
            .sort((a, b) => b.productivityPerHour - a.productivityPerHour); // Top performers first
    }

    /**
     * Tiến độ đơn hàng
     */
    async getOrderCompletion() {
        const orders = await prisma.productionOrder.findMany({
            where: { isDeleted: false },
            include: {
                operations: {
                    include: {
                        productionLogs: {
                            select: { okQty: true, ngQty: true },
                        },
                    },
                    orderBy: { sequence: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return orders.map(order => {
            const totalOk = order.operations.reduce((sum, op) =>
                sum + op.productionLogs.reduce((s, l) => s + l.okQty, 0), 0);
            const totalNg = order.operations.reduce((sum, op) =>
                sum + op.productionLogs.reduce((s, l) => s + l.ngQty, 0), 0);
            const completedOps = order.operations.filter(op => op.status === 'COMPLETED').length;

            return {
                orderCode: order.orderCode,
                productCode: order.productCode,
                customer: order.customer,
                status: order.status,
                plannedQty: order.plannedQty,
                actualOk: totalOk,
                actualNg: totalNg,
                completionPercent: order.plannedQty > 0
                    ? Math.min(100, Math.round((totalOk / order.plannedQty) * 100))
                    : 0,
                operationsTotal: order.operations.length,
                operationsCompleted: completedOps,
                dueDate: order.dueDate,
                isOverdue: order.dueDate < new Date() && order.status !== 'COMPLETED' && order.status !== 'CANCELLED',
            };
        });
    }

    /**
     * Phân tích NG theo công đoạn và sản phẩm
     */
    async getNgAnalysis(startDate: Date, endDate: Date) {
        const logs = await prisma.productionLog.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                ngQty: { gt: 0 },
            },
            include: {
                operation: {
                    select: {
                        name: true,
                        order: { select: { productCode: true } },
                    },
                },
            },
        });

        // By operation
        const byOperation = new Map<string, { ok: number; ng: number }>();
        // By product
        const byProduct = new Map<string, { ok: number; ng: number }>();

        // Need all logs (including okQty) for rate calculation
        const allLogs = await prisma.productionLog.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            include: {
                operation: {
                    select: {
                        name: true,
                        order: { select: { productCode: true } },
                    },
                },
            },
        });

        for (const log of allLogs) {
            // By operation
            const opName = log.operation.name;
            const opEntry = byOperation.get(opName) || { ok: 0, ng: 0 };
            opEntry.ok += log.okQty;
            opEntry.ng += log.ngQty;
            byOperation.set(opName, opEntry);

            // By product
            const productCode = log.operation.order.productCode;
            const prodEntry = byProduct.get(productCode) || { ok: 0, ng: 0 };
            prodEntry.ok += log.okQty;
            prodEntry.ng += log.ngQty;
            byProduct.set(productCode, prodEntry);
        }

        // NG reasons from NgRange
        const ngRanges = await prisma.ngRange.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            select: { reason: true, rangeStart: true, rangeEnd: true },
        });

        const byReason = new Map<string, { count: number; totalQty: number }>();
        for (const r of ngRanges) {
            const reason = r.reason || 'Không rõ lý do';
            const entry = byReason.get(reason) || { count: 0, totalQty: 0 };
            entry.count += 1;
            entry.totalQty += (r.rangeEnd - r.rangeStart + 1);
            byReason.set(reason, entry);
        }

        return {
            byOperation: Array.from(byOperation.entries()).map(([name, data]) => ({
                operationName: name,
                okQty: data.ok,
                ngQty: data.ng,
                ngRate: ((data.ng / (data.ok + data.ng)) * 100).toFixed(2),
            })).sort((a, b) => parseFloat(b.ngRate) - parseFloat(a.ngRate)),

            byProduct: Array.from(byProduct.entries()).map(([code, data]) => ({
                productCode: code,
                okQty: data.ok,
                ngQty: data.ng,
                ngRate: ((data.ng / (data.ok + data.ng)) * 100).toFixed(2),
            })).sort((a, b) => parseFloat(b.ngRate) - parseFloat(a.ngRate)),

            byReason: Array.from(byReason.entries())
                .map(([reason, data]) => ({ reason, ...data }))
                .sort((a, b) => b.totalQty - a.totalQty),
        };
    }

    /**
     * OEE - Overall Equipment Effectiveness
     * OEE = Availability × Performance × Quality
     */
    async getOEE(startDate: Date, endDate: Date) {
        const logs = await prisma.productionLog.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            select: {
                okQty: true,
                ngQty: true,
                startTime: true,
                endTime: true,
            },
        });

        if (logs.length === 0) {
            return { availability: 0, performance: 0, quality: 0, oee: 0, details: {} };
        }

        const totalOk = logs.reduce((s, l) => s + l.okQty, 0);
        const totalNg = logs.reduce((s, l) => s + l.ngQty, 0);
        const totalProduced = totalOk + totalNg;

        // Total run time (hours)
        const totalRunTime = logs.reduce((s, l) =>
            s + (new Date(l.endTime).getTime() - new Date(l.startTime).getTime()), 0) / 3600000;

        // Planned time = working days × 8h per shift
        const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
        const plannedTime = daysDiff * 8; // 8 hours per day (1 shift)

        // Availability = Run Time / Planned Time
        const availability = Math.min(1, totalRunTime / plannedTime);

        // Performance = (Total Produced / Run Time) / Ideal Rate
        // Ideal rate: assume 100 units per hour as baseline
        const idealRate = 100;
        const actualRate = totalRunTime > 0 ? totalProduced / totalRunTime : 0;
        const performance = Math.min(1, actualRate / idealRate);

        // Quality = OK qty / Total produced
        const quality = totalProduced > 0 ? totalOk / totalProduced : 0;

        const oee = availability * performance * quality;

        return {
            availability: Math.round(availability * 10000) / 100,
            performance: Math.round(performance * 10000) / 100,
            quality: Math.round(quality * 10000) / 100,
            oee: Math.round(oee * 10000) / 100,
            details: {
                totalRunTimeHours: Math.round(totalRunTime * 100) / 100,
                plannedTimeHours: plannedTime,
                totalProduced,
                totalOk,
                totalNg,
                actualRatePerHour: Math.round(actualRate),
            },
        };
    }

    // ─── Helpers ──────────────────────────────────────────────────

    private getGroupKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
        const d = new Date(date);
        if (groupBy === 'day') {
            return d.toISOString().split('T')[0];
        } else if (groupBy === 'week') {
            const firstDay = new Date(d);
            firstDay.setDate(d.getDate() - d.getDay() + 1); // Monday
            return `W${firstDay.toISOString().split('T')[0]}`;
        } else {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
    }
}

export const reportsService = new ReportsService();
