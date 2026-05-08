import { prisma } from '../../config/database.config';
import { Prisma } from '@prisma/client';
import { toVnTimeStr, getMonthDateRange, getThresholds } from './hr.utils';

// ─── Types ───────────────────────────────────────────────────

interface ViolationDetail {
    date: Date;
    checkIn: Date | null;
    checkOut: Date | null;
    isLate: boolean;
    lateMinutes: number;
    isEarly: boolean;
    earlyMinutes: number;
    note: string | null;
}

interface ViolatorStats {
    userId: number;
    fullName: string;
    department: string;
    count: number;
    details: ViolationDetail[];
}

// ─── Service ─────────────────────────────────────────────────

export class HrService {
    // ─── Departments ─────────────────────────────────────────────

    async getDepartments() {
        return prisma.department.findMany({
            include: { users: { select: { id: true, fullName: true, position: true } } },
            orderBy: { name: 'asc' },
        });
    }

    async createDepartment(data: { name: string; description?: string; managerId?: number }) {
        return prisma.department.create({ data });
    }

    async updateDepartment(id: number, data: { name?: string; description?: string; managerId?: number }) {
        return prisma.department.update({ where: { id }, data });
    }

    async deleteDepartment(id: number) {
        return prisma.department.delete({ where: { id } });
    }

    // ─── Shifts ──────────────────────────────────────────────────

    async getShifts() {
        return prisma.shift.findMany({ orderBy: { startTime: 'asc' } });
    }

    async createShift(data: { name: string; startTime: string; endTime: string; description?: string }) {
        return prisma.shift.create({ data });
    }

    async updateShift(id: number, data: { name?: string; startTime?: string; endTime?: string; description?: string }) {
        return prisma.shift.update({ where: { id }, data });
    }

    async deleteShift(id: number) {
        return prisma.shift.delete({ where: { id } });
    }

    // ─── Employees ───────────────────────────────────────────────

    async getEmployees(query: { departmentId?: number; search?: string; isActive?: boolean }) {
        const where: Prisma.UserWhereInput = {};

        if (query.departmentId) where.departmentId = query.departmentId;
        if (query.isActive !== undefined) where.isActive = query.isActive;
        if (query.search) {
            where.OR = [
                { fullName: { contains: query.search, mode: 'insensitive' } },
                { username: { contains: query.search, mode: 'insensitive' } },
                { phone: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        return prisma.user.findMany({
            where,
            select: {
                id: true, username: true, fullName: true, email: true,
                phone: true, position: true, isActive: true, avatarUrl: true,
                joinDate: true, departmentId: true, enrollNumber: true,
                role: { select: { name: true } },
                department: { select: { name: true } },
            },
            orderBy: { fullName: 'asc' },
        });
    }

    async deleteEmployee(id: number) {
        // Check if user has related data that would prevent deletion
        const [logs, attendances, transactions, audits] = await Promise.all([
            prisma.productionLog.count({ where: { userId: id } }),
            prisma.attendance.count({ where: { userId: id } }),
            prisma.stockTransaction.count({ where: { createdBy: id } }),
            prisma.auditLog.count({ where: { userId: id } }),
        ]);

        if (logs > 0 || attendances > 0 || transactions > 0 || audits > 0) {
            // Has data, do soft delete
            return prisma.user.update({
                where: { id },
                data: { isActive: false },
            });
        }

        // No related data, do hard delete
        return prisma.user.delete({
            where: { id },
        });
    }

    async updateEmployee(id: number, data: {
        departmentId?: number; position?: string; phone?: string; joinDate?: string; enrollNumber?: string;
    }) {
        const updateData: Record<string, unknown> = {};
        if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
        if (data.position !== undefined) updateData.position = data.position;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.enrollNumber !== undefined) updateData.enrollNumber = data.enrollNumber;
        if (data.joinDate) updateData.joinDate = new Date(data.joinDate);

        return prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true, fullName: true, position: true, phone: true,
                departmentId: true, joinDate: true, enrollNumber: true,
                department: { select: { name: true } },
            },
        });
    }

    // ─── Violation Report ────────────────────────────────────────

    async getViolationReport(month: number, year: number) {
        const { start, end } = getMonthDateRange(month, year);

        const records = await prisma.attendance.findMany({
            where: { date: { gte: start, lte: end } },
            include: {
                user: { select: { fullName: true, department: { select: { name: true } } } },
                shift: true
            },
            orderBy: { date: 'asc' }
        });

        const userStats = new Map<number, ViolatorStats>();
        const deptStats = new Map<string, number>();
        let totalViolations = 0;

        for (const r of records) {
            let isLate = false;
            let isEarly = false;
            let lateMinutes = 0;
            let earlyMinutes = 0;
            
            // Determine thresholds from shift or machine note
            let startLimit = '08:01:00';
            let shiftStartStr = '08:00:00';
            let endLimit = '17:00:00';

            if (r.shift?.startTime) {
                shiftStartStr = `${r.shift.startTime}:00`;
                const [h, m] = r.shift.startTime.split(':').map(Number);
                startLimit = `${String(h).padStart(2, '0')}:${String(m + 1).padStart(2, '0')}:00`;
            } else if (r.note?.includes('SX')) {
                const sxThresholds = getThresholds('SX');
                startLimit = sxThresholds.checkInLimit;
                shiftStartStr = sxThresholds.shiftStart;
            }

            if (r.shift?.endTime) {
                endLimit = `${r.shift.endTime}:00`;
            } else if (r.note?.includes('SX')) {
                endLimit = getThresholds('SX').checkOutLimit;
            }

            // Late Check-in logic
            if (r.checkIn) {
                const timeStr = toVnTimeStr(r.checkIn);
                if (timeStr >= startLimit) {
                    isLate = true;
                    const [h, m] = timeStr.split(':').map(Number);
                    const [sh, sm] = shiftStartStr.split(':').map(Number);
                    lateMinutes = (h * 60 + m) - (sh * 60 + sm);
                }
            }

            // Early Check-out logic
            if (r.checkOut) {
                const timeStr = toVnTimeStr(r.checkOut);
                if (timeStr < endLimit) {
                    isEarly = true;
                    const [h, m] = timeStr.split(':').map(Number);
                    const [eh, em] = endLimit.split(':').map(Number);
                    earlyMinutes = (eh * 60 + em) - (h * 60 + m);
                }
            }

            if (isLate || isEarly || r.status === 'LATE') {
                totalViolations++;
                
                // User stats
                if (!userStats.has(r.userId)) {
                    userStats.set(r.userId, {
                        userId: r.userId,
                        fullName: r.user.fullName,
                        department: r.user.department?.name || '-',
                        count: 0,
                        details: []
                    });
                }
                const stats = userStats.get(r.userId)!;
                stats.count++;
                stats.details.push({
                    date: r.date,
                    checkIn: r.checkIn,
                    checkOut: r.checkOut,
                    isLate,
                    lateMinutes,
                    isEarly,
                    earlyMinutes,
                    note: r.note
                });

                // Dept stats
                const dept = r.user.department?.name || 'Khác';
                deptStats.set(dept, (deptStats.get(dept) || 0) + 1);
            }
        }

        const topViolators = Array.from(userStats.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 15);

        const departmentBreakdown = Array.from(deptStats.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        return {
            totalViolations,
            uniqueViolators: userStats.size,
            topViolators,
            departmentBreakdown
        };
    }
}

export const hrService = new HrService();
