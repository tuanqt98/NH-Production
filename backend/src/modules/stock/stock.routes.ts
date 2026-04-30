import { Router } from 'express';
import { StockController } from './stock.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';

const router = Router();
const controller = new StockController();

router.use(authenticate);

// Publicly accessible within authenticated users
router.get('/history', controller.getHistory);
router.get('/requirements/:orderId', controller.getRequirements);

// Write operations (Transactions) restricted
router.post('/transactions', auditLog('Stock'), controller.createTransaction);
router.post('/requirements', authorize('admin', 'manager'), auditLog('Stock'), controller.addRequirement);

export default router;
