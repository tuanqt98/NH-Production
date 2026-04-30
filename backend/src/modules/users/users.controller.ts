import { Request, Response } from 'express';
import { UsersService } from './users.service';

const usersService = new UsersService();

export class UsersController {
    async getAll(req: Request, res: Response) {
        try {
            const users = await usersService.getAllUsers();
            res.json({ success: true, data: users });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getOne(req: Request, res: Response) {
        try {
            const userId = parseInt(req.params.id as string);
            const user = await usersService.getUserById(userId);
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });
            res.json({ success: true, data: user });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const user = await usersService.createUser(req.body);
            res.status(201).json({ success: true, data: user });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const userId = parseInt(req.params.id as string);
            const user = await usersService.updateUser(userId, req.body);
            res.json({ success: true, data: user });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async resetPassword(req: Request, res: Response) {
        try {
            const userId = parseInt(req.params.id as string);
            await usersService.resetPassword(userId);
            res.json({ success: true, message: 'Password reset to default "1"' });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateProfile(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId; // From auth middleware
            const user = await usersService.updateProfile(userId, req.body);
            res.json({ success: true, data: user });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async bulkDelete(req: Request, res: Response) {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ success: false, message: 'Invalid or empty IDs list' });
            }
            await usersService.bulkDeleteUsers(ids);
            res.json({ success: true, message: `Successfully processed bulk deletion for ${ids.length} users` });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const userId = parseInt(req.params.id as string);
            await usersService.deleteUser(userId);
            res.json({ success: true, message: 'User deactivated successfully' });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getRoles(req: Request, res: Response) {
        try {
            const roles = await usersService.getRoles();
            res.json({ success: true, data: roles });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async importUsers(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            const results = await usersService.importUsers(req.file.buffer);
            res.json({ success: true, data: results });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async uploadAvatar(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh' });
            }

            const userId = (req as any).user.userId;
            const avatarUrl = `/uploads/avatars/${req.file.filename}`;

            // Update user record with new avatar URL
            const user = await usersService.updateProfile(userId, { avatarUrl });

            res.json({ success: true, data: user });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}
