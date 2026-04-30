import { prisma } from '../../config/database.config';

export class DashboardService {
    /**
     * Get today's summary stats
     */
    async getSummary() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [totalOrders, completedOrders, inProgressOrders, overdueOrders, todayLogs] =
            await Promise.all([
                prisma.productionOrder.count({ where: { isDeleted: false } }),
                prisma.productionOrder.count({ where: { status: 'COMPLETED', isDeleted: false } }),
                prisma.productionOrder.count({ where: { status: 'IN_PROGRESS', isDeleted: false } }),
                prisma.productionOrder.count({
                    where: {
                        dueDate: { lt: new Date() },
                        status: { notIn: ['COMPLETED', 'CANCELLED'] },
                        isDeleted: false,
                    },
                }),
                prisma.productionLog.aggregate({
                    where: { createdAt: { gte: today, lt: tomorrow } },
                    _sum: { okQty: true, ngQty: true },
                }),
            ]);

        const todayOk = todayLogs._sum.okQty || 0;
        const todayNg = todayLogs._sum.ngQty || 0;
        const total = todayOk + todayNg;

        return {
            totalOrders,
            completedOrders,
            inProgressOrders,
            overdueOrders,
            todayOkQty: todayOk,
            todayNgQty: todayNg,
            completionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : '0.0',
            ngRate: total > 0 ? ((todayNg / total) * 100).toFixed(2) : '0.00',
        };
    }

    /**
     * Get daily output for the last N days (default 30)
     */
    async getDailyOutput(days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const logs = await prisma.productionLog.findMany({
            where: { createdAt: { gte: startDate } },
            select: { okQty: true, ngQty: true, createdAt: true },
        });

        // Group by date
        const dailyMap = new Map<string, { okQty: number; ngQty: number }>();

        // Initialize all dates
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const key = d.toISOString().split('T')[0];
            dailyMap.set(key, { okQty: 0, ngQty: 0 });
        }

        // Accumulate
        for (const log of logs) {
            const key = log.createdAt.toISOString().split('T')[0];
            const entry = dailyMap.get(key);
            if (entry) {
                entry.okQty += log.okQty;
                entry.ngQty += log.ngQty;
            }
        }

        return Array.from(dailyMap.entries()).map(([date, data]) => ({
            date,
            ...data,
            total: data.okQty + data.ngQty,
        }));
    }

    /**
     * Get overdue orders
     */
    async getOverdue() {
        return prisma.productionOrder.findMany({
            where: {
                dueDate: { lt: new Date() },
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
                isDeleted: false,
            },
            include: {
                operations: {
                    select: { id: true, name: true, status: true },
                    orderBy: { sequence: 'asc' },
                },
            },
            orderBy: { dueDate: 'asc' },
            take: 50,
        });
    }

    /**
     * Get bottleneck operations (highest avg duration and NG count)
     */
    async getBottleneck() {
        const operations = await prisma.operation.findMany({
            where: {
                productionLogs: { some: {} },
            },
            include: {
                productionLogs: {
                    select: { okQty: true, ngQty: true, startTime: true, endTime: true },
                },
            },
        });

        const bottleneckData = operations.map(op => {
            const logs = op.productionLogs;
            const totalNg = logs.reduce((sum, l) => sum + l.ngQty, 0);
            const totalTime = logs.reduce((sum, l) => {
                return sum + (new Date(l.endTime).getTime() - new Date(l.startTime).getTime());
            }, 0);
            const avgTime = logs.length > 0 ? totalTime / logs.length : 0;

            return {
                operationId: op.id,
                operationName: op.name,
                avgDurationMinutes: Math.round(avgTime / 60000),
                totalLogs: logs.length,
                totalNg,
            };
        });

        // Sort by avg duration descending
        return bottleneckData.sort((a, b) => b.avgDurationMinutes - a.avgDurationMinutes).slice(0, 10);
    }

    /**
     * Get NG rate by operation type
     */
    async getNgRate() {
        const operations = await prisma.operation.findMany({
            include: {
                productionLogs: {
                    select: { okQty: true, ngQty: true },
                },
            },
        });

        // Group by operation name
        const grouped = new Map<string, { ok: number; ng: number }>();

        for (const op of operations) {
            const name = op.name;
            const existing = grouped.get(name) || { ok: 0, ng: 0 };
            for (const log of op.productionLogs) {
                existing.ok += log.okQty;
                existing.ng += log.ngQty;
            }
            grouped.set(name, existing);
        }

        return Array.from(grouped.entries()).map(([name, data]) => ({
            operationName: name,
            totalOk: data.ok,
            totalNg: data.ng,
            total: data.ok + data.ng,
            ngRate: data.ok + data.ng > 0 ? ((data.ng / (data.ok + data.ng)) * 100).toFixed(2) : '0.00',
        }));
    }
}

export const dashboardService = new DashboardService();
