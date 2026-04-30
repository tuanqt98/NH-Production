import { Router } from 'express';
import { ngController } from './ng.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { createNgRangeSchema } from './ng.dto';

const router = Router();

router.use(authenticate);

// POST /api/ng/ranges — insert NG range (admin/manager/worker)
router.post(
    '/ranges',
    validate(createNgRangeSchema),
    auditLog('ng_ranges'),
    (req, res) => ngController.createRange(req, res)
);

// GET /api/ng/check/:number — check if number is NG
router.get('/check/:number', (req, res) => ngController.checkNumber(req, res));

// GET /api/ng/operation/:operationId — get NG ranges for operation
router.get('/operation/:operationId', (req, res) => ngController.findByOperation(req, res));

export default router;
