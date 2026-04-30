import { prisma } from '../../config/database.config';
import bcrypt from 'bcryptjs';
import * as xlsx from 'xlsx';
import { getFullNameParts } from '../../utils/string.utils';
import { logger } from '../../config/logger.config';

export class UsersService {
    async getAllUsers() {
        return prisma.user.findMany({
            include: {
                role: true,
                department: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getUserById(id: number) {
        return prisma.user.findUnique({
            where: { id },
            include: { role: true, department: true },
        });
    }

    async createUser(data: any) {
        const { password, username: providedUsername, ...userData } = data;
        const passwordHash = await bcrypt.hash(password || '1', 12);

        let username = providedUsername;
        if (!username || username.trim() === '') {
            username = await this.generateUsername(userData.fullName);
        }

        return prisma.user.create({
            data: {
                ...userData,
                username,
                passwordHash,
            },
            include: { role: true, department: true },
        });
    }

    async updateUser(id: number, data: any) {
        const { password, ...userData } = data;
        const updateData: any = { ...userData };

        if (password) {
            updateData.passwordHash = await bcrypt.hash(password, 12);
        }

        return prisma.user.update({
            where: { id },
            data: updateData,
            include: { role: true, department: true },
        });
    }

    async deleteUser(id: number) {
        // Check if user has related data that would prevent deletion
        const [logs, transactions, attendances, audits] = await Promise.all([
            prisma.productionLog.count({ where: { userId: id } }),
            prisma.stockTransaction.count({ where: { createdBy: id } }),
            prisma.attendance.count({ where: { userId: id } }),
            prisma.auditLog.count({ where: { userId: id } }),
        ]);

        if (logs > 0 || transactions > 0 || attendances > 0 || audits > 0) {
            // Has data, do soft delete
            return prisma.user.update({
                where: { id },
                data: { isActive: false },
            });
        }

        // No related data (or only refresh tokens which cascade), do hard delete
        return prisma.user.delete({
            where: { id },
        });
    }

    async resetPassword(id: number) {
        const passwordHash = await bcrypt.hash('1', 12);
        return prisma.user.update({
            where: { id },
            data: { passwordHash, isActive: true },
        });
    }

    async bulkDeleteUsers(ids: number[]) {
        const results = await Promise.all(ids.map(id => this.deleteUser(id)));
        return results;
    }

    async updateProfile(userId: number, data: any) {
        const { currentPassword, newPassword, avatarUrl, fullName, email } = data;
        const updateData: any = {};

        if (fullName) updateData.fullName = fullName;
        if (email) updateData.email = email;
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

        if (newPassword) {
            // Verify current password first
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) throw new Error('User not found');

            const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isValid) throw new Error('Mật khẩu hiện tại không chính xác');

            updateData.passwordHash = await bcrypt.hash(newPassword, 12);
        }

        return prisma.user.update({
            where: { id: userId },
            data: updateData,
            include: { role: true },
        });
    }

    async getRoles() {
        return prisma.role.findMany();
    }

    /**
     * Algorithmic username generation (e.g. TuanNQ01)
     */
    async generateUsername(fullName: string): Promise<string> {
        const { firstName, initials } = getFullNameParts(fullName);
        const prefix = `${firstName}${initials}`;

        // Find existing users with this prefix
        const existingUsers = await prisma.user.findMany({
            where: {
                username: {
                    startsWith: prefix
                }
            },
            select: { username: true }
        });

        if (existingUsers.length === 0) {
            return `${prefix}01`;
        }

        // Extract numbers and find max
        const numbers = existingUsers
            .map((u: { username: string }) => {
                const match = u.username.match(/\d+$/);
                return match ? parseInt(match[0]) : 0;
            })
            .filter((n: number) => !isNaN(n));

        const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
        const nextNumber = (maxNumber + 1).toString().padStart(2, '0');

        return `${prefix}${nextNumber}`;
    }

    /**
     * Bulk import users from Excel
     */
    async importUsers(fileBuffer: Buffer) {
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get data as array of arrays to handle missing headers
        const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        if (rows.length === 0) return results;

        const roles = await this.getRoles();
        const departments = await prisma.department.findMany();
        const defaultPassword = '1';
        const passwordHash = await bcrypt.hash(defaultPassword, 12);

        // Detect column indices
        let nameIdx = -1;
        let deptIdx = -1;
        let emailIdx = -1;
        let roleIdx = -1;

        const firstRow = rows[0];
        const hasHeader = firstRow.some(cell => {
            const val = cell?.toString().toLowerCase();
            return val && (val.includes('họ') || val.includes('tên') || val.includes('name') || val.includes('bộ phận') || val.includes('phòng') || val.includes('dept'));
        });

        let startIdx = 0;
        if (hasHeader) {
            startIdx = 1;
            firstRow.forEach((cell, i) => {
                const val = cell?.toString().toLowerCase() || '';
                if (val.includes('họ') || val.includes('tên') || val.includes('name')) nameIdx = i;
                else if (val.includes('bộ phận') || val.includes('phòng') || val.includes('dept')) deptIdx = i;
                else if (val.includes('email')) emailIdx = i;
                else if (val.includes('vai trò') || val.includes('role')) roleIdx = i;
            });
        } else {
            // Default mapping if no header: Column 0 = Name, Column 1 = Dept
            nameIdx = 0;
            deptIdx = 1;
        }

        // Fallback: if nameIdx still -1, take the first column
        if (nameIdx === -1) nameIdx = 0;

        for (let i = startIdx; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            try {
                const fullName = row[nameIdx]?.toString().trim();
                const deptName = deptIdx !== -1 ? row[deptIdx]?.toString().trim() : undefined;
                const roleName = roleIdx !== -1 ? row[roleIdx]?.toString().trim().toLowerCase() : 'worker';
                let email = emailIdx !== -1 ? row[emailIdx]?.toString().trim() : undefined;

                if (!fullName) continue; // Skip empty names

                const username = await this.generateUsername(fullName);
                
                if (!email) {
                    email = `${username.toLowerCase()}@nhprinting.com`;
                }

                const role = roles.find((r: any) => r.name.toLowerCase() === roleName) || roles.find((r: any) => r.name === 'worker');
                
                let departmentId: number | undefined = undefined;
                if (deptName) {
                    let dept = departments.find((d: any) => 
                        d.name.toLowerCase() === deptName.toLowerCase() ||
                        d.name.toLowerCase().includes(deptName.toLowerCase())
                    );
                    
                    if (!dept) {
                        // Create new department if not found
                        dept = await prisma.department.create({
                            data: { name: deptName }
                        });
                        departments.push(dept); // Add to local list for subsequent rows
                    }
                    departmentId = dept?.id;
                }

                await prisma.user.create({
                    data: {
                        username,
                        email,
                        fullName,
                        passwordHash,
                        roleId: role?.id || 3,
                        departmentId: departmentId,
                        isActive: true
                    }
                });

                results.success++;
            } catch (error: any) {
                results.failed++;
                results.errors.push(error.message);
                logger.error(`Import failed for row ${i}: ${JSON.stringify(row)}. Error: ${error.message}`);
            }
        }

        return results;
    }
}
