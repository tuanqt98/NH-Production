import { Router } from 'express';
import { ordersController } from './orders.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { createOrderSchema, updateOrderSchema, queryOrdersSchema } from './orders.dto';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/orders — list (all authenticated users)
router.get(
    '/',
    validate(queryOrdersSchema, 'query'),
    (req, res) => ordersController.findAll(req, res)
);

// GET /api/orders/:id — detail
router.get('/:id', (req, res) => ordersController.findById(req, res));

// POST /api/orders — create (admin/manager)
router.post(
    '/',
    authorize('admin', 'manager'),
    validate(createOrderSchema),
    auditLog('production_orders'),
    (req, res) => ordersController.create(req, res)
);

// PUT /api/orders/:id — update (admin/manager)
router.put(
    '/:id',
    authorize('admin', 'manager'),
    validate(updateOrderSchema),
    auditLog('production_orders'),
    (req, res) => ordersController.update(req, res)
);

// DELETE /api/orders/:id — soft delete (admin only)
router.delete(
    '/:id',
    authorize('admin'),
    auditLog('production_orders'),
    (req, res) => ordersController.delete(req, res)
);

export default router;
