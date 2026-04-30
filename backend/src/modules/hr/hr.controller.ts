import { Response } from 'express';
import { prisma } from '../../config/database.config';
import { hrService } from './hr.service';
import { attendanceService } from './attendance.service';
import { attendanceMachineService } from './attendance-machine.service';
import { AuthRequest } from '../../types';

export class HrController {
    // ─── Departments ─────────────────────────────────────────────

    async getDepartments(req: AuthRequest, res: Response) {
        try {
            const data = await hrService.getDepartments();
            res.json({ success: true, data });
        } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
    }

    async createDepartment(req: AuthRequest, res: Response) {
        try {
            const data = await hrService.createDepartment(req.body);
            res.status(201).json({ success: true, data });
        } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
    }

    async updateDepartment(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            const data = await hrService.updateDepartment(id, req.body);
            res.json({ success: true, data });
        } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
    }

    async deleteDepartment(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            await hrService.deleteDepartment(id);
            res.json({ success: true, message: 'Đã xóa bộ phận' });
        } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
    }

    // ─── Shifts ──────────────────────────────────────────────────

    async getShifts(req: AuthRequest, res: Response) {
        try {
            const data = await hrService.getShifts();
            res.json({ success: true, data });
        } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
    }

    async createShift(req: AuthRequest, res: Response) {
        try {
            const data = await hrService.createShift(req.body);
            res.status(201).json({ success: true, data });
        } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
    }

    async updateShift(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            const data = await hrService.updateShift(id, req.body);
            res.json({ success: true, data });
        } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
    }

    async deleteShift(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            await hrService.deleteShift(id);
            res.json({ success: true, message: 'Đã xóa ca' });
        } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
    }

    // ─── Employees ───────────────────────────────────────────────

    async getEmployees(req: AuthRequest, res: Response) {
        try {
            const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;
            const search = req.query.search as string | undefined;
            const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
            const data = await hrService.getEmployees({ departmentId, search, isActive });
            res.json({ success: true, data });
        } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
    }

    async updateEmployee(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            const data = await hrService.updateEmployee(id, req.body);
            res.json({ success: true, data });
        } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
    }

    async deleteEmployee(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            await hrService.deleteEmployee(id);
            res.json({ success: true, message: 'Đã xóa nhân viên' });
        } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
    }

    // ─── Attendance ──────────────────────────────────────────────

    async checkIn(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.userId;
            const data = await attendanceService.checkIn(userId, req.body.shiftId);
            res.json({ success: true, data });
        } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
    }

    async checkOut(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.userId;
            const data = await attendanceService.checkOut(userId);
            res.json({ success: true, data });
        } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
    }

    async getAttendance(req: AuthRequest, res: Response) {
        try {
            const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
            const year = parseInt(req.query.year as string) || new Date().getFullYear();
            
            // Security: If not admin/manager, force userId to current user's ID
            let userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
            const role = req.user!.role;
            if (role !== 'admin' && role !== 'manager') {
                userId = req.user!.userId;
            }

            const data = await attendanceService.getMonthlyAttendance(month, year, userId);
            res.json({ success: true, data });
        } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
    }

    async getAttendanceSummary(req: AuthRequest, res: Response) {
        try {
            const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
            const year = parseInt(req.query.year as string) || new Date().getFullYear();
            
            let data = await attendanceService.getMonthlySummary(month, year);
            
            // Security: If not admin/manager, filter results to only include current user
            const role = req.user!.role;
            if (role !== 'admin' && role !== 'manager') {
                const userId = req.user!.userId;
                data = data.filter((s: any) => s.userId === userId);
            }

            res.json({ success: true, data });
        } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
    }

    async updateAttendance(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            const data = await attendanceService.updateAttendance(id, req.body);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // ─── Attendance Machines ─────────────────────────────────────

    async getMachines(req: AuthRequest, res: Response) {
        try {
            const data = await attendanceMachineService.getMachines();
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async saveMachine(req: AuthRequest, res: Response) {
        try {
            const data = await attendanceMachineService.saveMachine(req.body);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async deleteMachine(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            await attendanceMachineService.deleteMachine(id);
            res.json({ success: true, message: 'Xóa máy thành công' });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async syncMachines(req: AuthRequest, res: Response) {
        try {
            const results = await attendanceMachineService.syncAllMachines();
            res.json({ success: true, data: results });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getMachineUsers(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            const data = await attendanceMachineService.getMachineUsers(id);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async autoMapUsers(req: AuthRequest, res: Response) {
        try {
            const machines = await attendanceMachineService.getMachines();
            let totalMapped = 0;
            const logger = require('../../config/logger.config').logger;

            // Helper: remove Vietnamese diacritics
            const removeDiacritics = (str: string) => 
                str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').trim().toLowerCase();

            for (const machine of machines) {
                try {
                    const result = await attendanceMachineService.getMachineUsers(machine.id);
                    const dbUsers = await prisma.user.findMany({
                        where: { isActive: true, enrollNumber: null },
                        select: { id: true, fullName: true }
                    });

                    logger.info(`Auto-map: Machine ${machine.name} has ${result.users.length} users, DB has ${dbUsers.length} unmapped users`);
                    
                    // Log first 5 machine user names for debugging
                    const sampleNames = result.users.slice(0, 5).map((u: any) => `"${u.name}" (ID:${u.id})`);
                    logger.info(`Auto-map: Sample machine names: ${sampleNames.join(', ')}`);

                    for (const mu of result.users) {
                        if (!mu.name || mu.mapped) continue;
                        const muNorm = removeDiacritics(mu.name);
                        
                        const match = dbUsers.find(u => removeDiacritics(u.fullName) === muNorm);
                        if (match) {
                            await prisma.user.update({
                                where: { id: match.id },
                                data: { enrollNumber: mu.id?.toString() }
                            });
                            logger.info(`Auto-map: Matched "${mu.name}" (ID:${mu.id}) -> "${match.fullName}" (DB:${match.id})`);
                            totalMapped++;
                            // Remove from dbUsers to avoid double mapping
                            const idx = dbUsers.findIndex(u => u.id === match.id);
                            if (idx >= 0) dbUsers.splice(idx, 1);
                        }
                    }
                } catch (e: any) { 
                    logger.error(`Auto-map error for machine ${machine.name}: ${e.message}`);
                }
            }

            res.json({ success: true, data: { mapped: totalMapped } });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getViolationReport(req: AuthRequest, res: Response) {
        try {
            const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
            const year = parseInt(req.query.year as string) || new Date().getFullYear();
            const data = await hrService.getViolationReport(month, year);
            res.json({ success: true, data });
        } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
    }
}
