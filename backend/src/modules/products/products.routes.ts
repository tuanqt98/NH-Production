import { Router } from 'express';
import { ProductsController } from './products.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';

const router = Router();
const controller = new ProductsController();

router.use(authenticate);

// Manager and Admin can manage products
router.get('/', controller.getAll);
router.get('/:id', controller.getOne);

router.post('/', authorize('admin', 'manager'), auditLog('Product'), controller.create);
router.put('/:id', authorize('admin', 'manager'), auditLog('Product'), controller.update);
router.delete('/:id', authorize('admin', 'manager'), auditLog('Product'), controller.delete);

export default router;
