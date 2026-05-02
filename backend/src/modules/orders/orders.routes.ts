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

// GET /api/orders/department/:view — MUST be before /:id to avoid conflict
router.get(
    '/department/:view',
    (req, res) => ordersController.getByDepartment(req, res)
);

// GET /api/orders/:id — detail
router.get('/:id', (req, res) => ordersController.findById(req, res));

// GET /api/orders/:id/history — workflow history
router.get('/:id/history', (req, res) => ordersController.getHistory(req, res));

// POST /api/orders — create (admin/manager)
router.post(
    '/',
    authorize('admin', 'manager'),
    validate(createOrderSchema),
    auditLog('production_orders'),
    (req, res) => ordersController.create(req, res)
);

// POST /api/orders/:id/workflow/:action — transition status
router.post(
    '/:id/workflow/:action',
    (req, res) => ordersController.workflowTransition(req, res)
);

// PUT /api/orders/:id — update (admin/manager)
router.put(
    '/:id',
    authorize('admin', 'manager'),
    validate(updateOrderSchema),
    auditLog('production_orders'),
    (req, res) => ordersController.update(req, res)
);

// PUT /api/orders/:id/design — update design info (BP Thiết kế)
router.put('/:id/design', (req, res) => ordersController.updateDesign(req, res));

// PUT /api/orders/:id/planning — update planning info (BP Kế hoạch)
router.put('/:id/planning', (req, res) => ordersController.updatePlanning(req, res));

// DELETE /api/orders/:id — soft delete (admin only)
router.delete(
    '/:id',
    authorize('admin'),
    auditLog('production_orders'),
    (req, res) => ordersController.delete(req, res)
);

export default router;
