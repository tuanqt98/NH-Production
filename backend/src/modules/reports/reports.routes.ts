import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';

const router = Router();
const controller = new ReportsController();

// All reports require authentication
router.use(authenticate);

// Reports accessible to admin and manager
router.use(authorize('admin', 'manager'));

router.get('/production-summary', controller.getProductionSummary);
router.get('/worker-productivity', controller.getWorkerProductivity);
router.get('/order-completion', controller.getOrderCompletion);
router.get('/ng-analysis', controller.getNgAnalysis);
router.get('/oee', controller.getOEE);
router.get('/export', controller.exportExcel);

export default router;
