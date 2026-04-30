import { Router } from 'express';
import { MaterialsController } from './materials.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';

const router = Router();
const controller = new MaterialsController();

router.use(authenticate);

// Listing and alerts accessible to users with appropriate roles
router.get('/', controller.getAll);
router.get('/alerts', controller.getAlerts);
router.get('/categories', controller.getCategories);
router.get('/:id', controller.getOne);

// Write operations restricted to admin/manager
router.use(authorize('admin', 'manager'));

router.post('/', auditLog('Material'), controller.create);
router.put('/:id', auditLog('Material'), controller.update);
router.delete('/:id', auditLog('Material'), controller.delete);

export default router;
