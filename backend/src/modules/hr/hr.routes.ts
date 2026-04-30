import { Router } from 'express';
import { HrController } from './hr.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';

const router = Router();
const c = new HrController();

router.use(authenticate);

// ─── Read endpoints (all authenticated users) ───────────────
router.get('/departments', c.getDepartments);
router.get('/shifts', c.getShifts);
router.get('/employees', c.getEmployees);
router.get('/attendance', c.getAttendance);
router.get('/attendance/summary', c.getAttendanceSummary);

// ─── Attendance self-service ─────────────────────────────────
router.post('/attendance/check-in', c.checkIn);
router.post('/attendance/check-out', c.checkOut);

// ─── Admin/Manager only ──────────────────────────────────────
router.use(authorize('admin', 'manager'));

router.post('/departments', auditLog('Department'), c.createDepartment);
router.put('/departments/:id', auditLog('Department'), c.updateDepartment);
router.delete('/departments/:id', auditLog('Department'), c.deleteDepartment);

router.post('/shifts', auditLog('Shift'), c.createShift);
router.put('/shifts/:id', auditLog('Shift'), c.updateShift);
router.delete('/shifts/:id', auditLog('Shift'), c.deleteShift);

router.put('/employees/:id', auditLog('Employee'), c.updateEmployee);
router.delete('/employees/:id', auditLog('Employee'), c.deleteEmployee);
router.put('/attendance/:id', auditLog('Attendance'), c.updateAttendance);

// Machines
router.get('/machines', c.getMachines);
router.post('/machines', auditLog('AttendanceMachine'), c.saveMachine);
router.delete('/machines/:id', auditLog('AttendanceMachine'), c.deleteMachine);
router.post('/machines/sync', auditLog('AttendanceMachine'), c.syncMachines);
router.get('/machines/:id/users', c.getMachineUsers);
router.post('/machines/auto-map', auditLog('AttendanceMachine'), c.autoMapUsers);
router.get('/violations/report', c.getViolationReport);

export default router;
