import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// GET /api/dashboard/summary — today's totals
router.get('/summary', (req, res) => dashboardController.getSummary(req, res));

// GET /api/dashboard/daily-output?days=30 — output by day
router.get('/daily-output', (req, res) => dashboardController.getDailyOutput(req, res));

// GET /api/dashboard/overdue — overdue orders
router.get('/overdue', (req, res) => dashboardController.getOverdue(req, res));

// GET /api/dashboard/bottleneck — bottleneck operations
router.get('/bottleneck', (req, res) => dashboardController.getBottleneck(req, res));

// GET /api/dashboard/ng-rate — NG rate by operation type
router.get('/ng-rate', (req, res) => dashboardController.getNgRate(req, res));

export default router;
