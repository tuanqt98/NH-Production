import { prisma } from '../../config/database.config';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceService {
    /**
     * Check-in: tạo hoặc cập nhật bản ghi chấm công hôm nay
     */
    async checkIn(userId: number, shiftId?: number) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const now = new Date();

        // Xác định trạng thái (LATE nếu check-in sau 8:30)
        const hour = now.getHours();
        const minute = now.getMinutes();
        const isLate = hour > 8 || (hour === 8 && minute > 30);

        return prisma.attendance.upsert({
            where: { userId_date: { userId, date: today } },
            create: {
                userId,
                date: today,
                shiftId,
                checkIn: now,
                status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
            },
            update: {
                checkIn: now,
                status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
            },
        });
    }

    /**
     * Check-out: cập nhật giờ ra và tính OT
     */
    async checkOut(userId: number) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const now = new Date();

        const attendance = await prisma.attendance.findUnique({
            where: { userId_date: { userId, date: today } },
        });

        if (!attendance) {
            throw new Error('Chưa check-in hôm nay');
        }

        // Tính overtime: > 8 tiếng = overtime
        let overtimeHours = 0;
        if (attendance.checkIn) {
            const workedMs = now.getTime() - attendance.checkIn.getTime();
            const workedHours = workedMs / (1000 * 60 * 60);
            overtimeHours = Math.max(0, Math.round((workedHours - 8) * 10) / 10);
        }

        return prisma.attendance.update({
            where: { userId_date: { userId, date: today } },
            data: { checkOut: now, overtimeHours },
        });
    }

    /**
     * Lấy bảng chấm công theo tháng
     */
    async getMonthlyAttendance(month: number, year: number, userId?: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // last day of month

        const where: any = {
            date: { gte: startDate, lte: endDate },
        };
        if (userId) where.userId = userId;

        return prisma.attendance.findMany({
            where,
            include: {
                user: { select: { id: true, fullName: true, position: true, department: { select: { name: true } } } },
                shift: true,
            },
            orderBy: [{ date: 'asc' }, { userId: 'asc' }],
        });
    }

    /**
     * Thống kê chấm công tháng: tổng ngày công, OT, đi muộn
     */
    async getMonthlySummary(month: number, year: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Fetch all active users who are not admin (typically only workers/managers need attendance)
        const users = await prisma.user.findMany({
            where: { isActive: true },
            include: { department: { select: { name: true } } }
        });

        const records = await prisma.attendance.findMany({
            where: { date: { gte: startDate, lte: endDate } },
        });

        // Initialize user map with all users
        const userMap = new Map<number, {
            userId: number; fullName: string; department: string;
            totalDays: number; presentDays: number; lateDays: number;
            absentDays: number; leaveDays: number; totalOT: number;
        }>();

        for (const user of users) {
            userMap.set(user.id, {
                userId: user.id,
                fullName: user.fullName,
                department: user.department?.name || '-',
                totalDays: 0, presentDays: 0, lateDays: 0,
                absentDays: 0, leaveDays: 0, totalOT: 0,
            });
        }

        for (const r of records) {
            const u = userMap.get(r.userId);
            if (!u) continue; // Skip if user is not active/not found

            u.totalDays++;
            if (r.status === 'PRESENT') u.presentDays++;
            if (r.status === 'LATE') { u.lateDays++; u.presentDays++; }
            if (r.status === 'ABSENT') u.absentDays++;
            if (r.status === 'LEAVE') u.leaveDays++;
            u.totalOT += r.overtimeHours;
        }

        return Array.from(userMap.values());
    }

    /**
     * Cập nhật chấm công thủ công (admin)
     */
    async updateAttendance(id: number, data: {
        status?: AttendanceStatus; overtimeHours?: number; note?: string;
        checkIn?: string; checkOut?: string;
    }) {
        const updateData: any = {};
        if (data.status) updateData.status = data.status;
        if (data.overtimeHours !== undefined) updateData.overtimeHours = data.overtimeHours;
        if (data.note !== undefined) updateData.note = data.note;
        if (data.checkIn) updateData.checkIn = new Date(data.checkIn);
        if (data.checkOut) updateData.checkOut = new Date(data.checkOut);

        return prisma.attendance.update({ where: { id }, data: updateData });
    }
}

export const attendanceService = new AttendanceService();
