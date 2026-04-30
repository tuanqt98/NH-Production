import { Router } from 'express';
import multer from 'multer';
import { UsersController } from './users.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';

import { avatarUpload } from '../../config/multer.config';

const router = Router();
const controller = new UsersController();
const upload = multer({ storage: multer.memoryStorage() });

// All users need to be authenticated
router.use(authenticate);

// Self-service profile management (ANY logged in user)
router.post('/profile', auditLog('User'), controller.updateProfile);
router.post('/upload-avatar', (req, res, next) => {
    avatarUpload.single('avatar')(req, res, (err: any) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ success: false, message: 'File quá lớn. Dung lượng tối đa 5MB.' });
            }
            return res.status(400).json({ success: false, message: err.message || 'Lỗi khi tải file' });
        }
        next();
    });
}, controller.uploadAvatar);

// Admin only routes for user management
router.use(authorize('admin'));

router.get('/', controller.getAll);
router.get('/roles', controller.getRoles);
router.get('/:id', controller.getOne);

router.post('/', auditLog('User'), controller.create);
router.put('/:id', auditLog('User'), controller.update);
router.post('/bulk-delete', auditLog('User'), controller.bulkDelete);
router.delete('/:id', auditLog('User'), controller.delete);
router.post('/:id/reset-password', auditLog('User'), controller.resetPassword);

router.post('/import', upload.single('file'), auditLog('User'), controller.importUsers);

export default router;
