import { prisma } from '../../config/database.config';
import { Prisma } from '@prisma/client';

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
        const updateData: any = {};
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

    async getViolationReport(month: number, year: number) {
        // Use string dates to ensure Prisma doesn't shift by timezone for @db.Date fields
        const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const records = await prisma.attendance.findMany({
            where: {
                date: { gte: new Date(startStr), lte: new Date(endStr) },
                OR: [
                    { status: 'LATE' },
                    { checkIn: { not: null } },
                    { checkOut: { not: null } }
                ]
            },
            include: {
                user: { select: { fullName: true, department: { select: { name: true } } } },
                shift: true
            },
            orderBy: { date: 'asc' }
        });

        const userStats = new Map<number, any>();
        const deptStats = new Map<string, number>();
        let totalViolations = 0;
        
        for (const r of records) {
            let isLate = false;
            let isEarly = false;
            let lateMinutes = 0;
            let earlyMinutes = 0;
            
            // Late Check-in logic
            if (r.checkIn) {
                let startHour = 8, startMin = 0;
                if (r.shift?.startTime) {
                    [startHour, startMin] = r.shift.startTime.split(':').map(Number);
                } else if (r.note?.includes('SX')) startHour = 7;
                else if (r.note?.includes('VP')) startHour = 8;
                
                const ci = new Date(r.checkIn);
                const shiftStart = new Date(ci);
                shiftStart.setHours(startHour, startMin, 0, 0);
                
                // Strict check including seconds, but with 1-minute grace period (>= 08:01:00)
                const graceStart = new Date(shiftStart);
                graceStart.setMinutes(startMin + 1);
                
                if (ci.getTime() >= graceStart.getTime()) {
                    isLate = true;
                    lateMinutes = Math.ceil((ci.getTime() - shiftStart.getTime()) / 60000);
                }
            }

            // Early Check-out logic
            if (r.checkOut) {
                let endHour = 17, endMin = 0;
                if (r.shift?.endTime) {
                    [endHour, endMin] = r.shift.endTime.split(':').map(Number);
                } else if (r.note?.includes('SX')) endHour = 16;
                else if (r.note?.includes('VP')) endHour = 17;
                
                const co = new Date(r.checkOut);
                const shiftEnd = new Date(co);
                shiftEnd.setHours(endHour, endMin, 0, 0);
                
                if (co.getTime() < shiftEnd.getTime()) {
                    isEarly = true;
                    earlyMinutes = Math.ceil((shiftEnd.getTime() - co.getTime()) / 60000);
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
                const stats = userStats.get(r.userId);
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
            .slice(0, 15); // Show more in the top list

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
