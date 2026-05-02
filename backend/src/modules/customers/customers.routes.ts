import { Router } from 'express';
import { CustomersController } from './customers.controller';
import { authenticate } from '../../middleware/auth.middleware';
import multer from 'multer';

const router = Router();
const controller = new CustomersController();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', authenticate, (req, res) => controller.getAll(req, res));
router.get('/search', authenticate, (req, res) => controller.search(req, res));
router.post('/import', authenticate, upload.single('file'), (req, res) => controller.importExcel(req, res));
router.post('/delete-bulk', authenticate, (req, res) => controller.bulkDelete(req, res));
router.get('/:id', authenticate, (req, res) => controller.getOne(req, res));
router.post('/', authenticate, (req, res) => controller.create(req, res));
router.put('/:id', authenticate, (req, res) => controller.update(req, res));
router.delete('/:id', authenticate, (req, res) => controller.delete(req, res));

export default router;
