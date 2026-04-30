import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { loginSchema, registerSchema } from './auth.dto';
import { authRateLimiter } from '../../config/security.config';

const router = Router();

// Public routes (rate limited)
router.post('/login', authRateLimiter, validate(loginSchema), (req, res) => authController.login(req, res));
router.post('/refresh', authRateLimiter, (req, res) => authController.refresh(req, res));

// Protected routes
router.post('/logout', authenticate, (req, res) => authController.logout(req, res));
router.get('/me', authenticate, (req, res) => authController.me(req, res));

// Admin only
router.post(
    '/register',
    authenticate,
    authorize('admin'),
    validate(registerSchema),
    (req, res) => authController.register(req, res)
);

export default router;
