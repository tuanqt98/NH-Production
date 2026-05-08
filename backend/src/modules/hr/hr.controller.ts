import { Response } from 'express';
import { hrService } from './hr.service';
import { attendanceService } from './attendance.service';
import { attendanceMachineService } from './attendance-machine.service';
import { AuthRequest } from '../../types';

// ─── Helpers ─────────────────────────────────────────────────

/** Safely parse an integer from request params/query, returns NaN if invalid */
const parseId = (value: string | string[] | undefined): number => {
    const str = Array.isArray(value) ? value[0] : value;
    return parseInt(str || '', 10);
};

export class HrController {
    // ─── Departments ─────────────────────────────────────────────

    async getDepartments(_req: AuthRequest, res: Response) {
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
            const id = parseId(req.params.id);
            if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
            const data = await hrService.updateDepartment(id, req.body);
            res.json({ success: true, data });
        } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
    }

    async deleteDepartment(req: AuthRequest, res: Response) {
        try {
            const id = parseId(req.params.id);
            if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
            await hrService.deleteDepartment(id);
            res.json({ success: true, message: 'Đã xóa bộ phận' });
        } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
    }

    // ─── Shifts ──────────────────────────────────────────────────

    async getShifts(_req: AuthRequest, res: Response) {
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
            const id = parseId(req.params.id);
            if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
            const data = await hrService.updateShift(id, req.body);
            res.json({ success: true, data });
        } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
    }

    async deleteShift(req: AuthRequest, res: Response) {
        try {
            const id = parseId(req.params.id);
            if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
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
            const id = parseId(req.params.id);
            if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
            const data = await hrService.updateEmployee(id, req.body);
            res.json({ success: true, data });
        } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
    }

    async deleteEmployee(req: AuthRequest, res: Response) {
        try {
            const id = parseId(req.params.id);
            if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
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
            const id = parseId(req.params.id);
            if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
            const data = await attendanceService.updateAttendance(id, req.body);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // ─── Attendance Machines ─────────────────────────────────────

    async getMachines(_req: AuthRequest, res: Response) {
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
            const id = parseId(req.params.id);
            if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
            await attendanceMachineService.deleteMachine(id);
            res.json({ success: true, message: 'Xóa máy thành công' });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async syncMachines(_req: AuthRequest, res: Response) {
        try {
            const results = await attendanceMachineService.syncAllMachines();
            res.json({ success: true, data: results });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getMachineUsers(req: AuthRequest, res: Response) {
        try {
            const id = parseId(req.params.id);
            if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
            const data = await attendanceMachineService.getMachineUsers(id);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async autoMapUsers(_req: AuthRequest, res: Response) {
        try {
            const totalMapped = await attendanceMachineService.autoMapUsers();
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
