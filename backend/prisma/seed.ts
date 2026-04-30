/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // ─── Create Roles ──────────────────────────────────────────
    const adminRole = await prisma.role.upsert({
        where: { name: 'admin' },
        update: {},
        create: {
            name: 'admin',
            description: 'Full system access',
            permissions: JSON.parse(JSON.stringify([
                'orders:read', 'orders:create', 'orders:update', 'orders:delete',
                'logs:read', 'logs:create',
                'ng:read', 'ng:create',
                'dashboard:read',
                'users:read', 'users:create', 'users:update', 'users:delete',
            ])),
        },
    });

    const managerRole = await prisma.role.upsert({
        where: { name: 'manager' },
        update: {},
        create: {
            name: 'manager',
            description: 'Read + write access (no user management)',
            permissions: JSON.parse(JSON.stringify([
                'orders:read', 'orders:create', 'orders:update',
                'logs:read', 'logs:create',
                'ng:read', 'ng:create',
                'dashboard:read',
            ])),
        },
    });

    const workerRole = await prisma.role.upsert({
        where: { name: 'worker' },
        update: {},
        create: {
            name: 'worker',
            description: 'Production input only',
            permissions: JSON.parse(JSON.stringify([
                'orders:read',
                'logs:read', 'logs:create',
                'ng:read', 'ng:create',
                'dashboard:read',
            ])),
        },
    });

    console.log('✅ Roles created:', { adminRole, managerRole, workerRole });

    // ─── Create Admin User ────────────────────────────────────
    const adminPassword = await bcrypt.hash('1', 12);
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@nhprinting.com',
            passwordHash: adminPassword,
            fullName: 'System Administrator',
            roleId: adminRole.id,
        },
    });

    // ─── Create Sample Manager ────────────────────────────────
    const managerPassword = await bcrypt.hash('1', 12);
    const manager = await prisma.user.upsert({
        where: { username: 'manager1' },
        update: {},
        create: {
            username: 'manager1',
            email: 'manager@nhprinting.com',
            passwordHash: managerPassword,
            fullName: 'Nguyễn Văn Quản Lý',
            roleId: managerRole.id,
        },
    });

    // ─── Create Sample Worker ─────────────────────────────────
    const workerPassword = await bcrypt.hash('1', 12);
    const worker = await prisma.user.upsert({
        where: { username: 'worker1' },
        update: {},
        create: {
            username: 'worker1',
            email: 'worker@nhprinting.com',
            passwordHash: workerPassword,
            fullName: 'Trần Thị Công Nhân',
            roleId: workerRole.id,
        },
    });

    console.log('✅ Users created:', { admin: admin.username, manager: manager.username, worker: worker.username });

    // ─── Create Master Data (Products & Templates) ──────────────
    const product1 = await prisma.product.upsert({
        where: { code: 'HOP-A4-001' },
        update: {},
        create: {
            code: 'HOP-A4-001',
            name: 'Hộp giấy A4 - Standard',
            description: 'Hộp giấy khổ A4, giấy ivory 300gsm',
            templates: {
                create: [
                    { name: 'In', sequence: 1 },
                    { name: 'Cán', sequence: 2 },
                    { name: 'Bế', sequence: 3 },
                    { name: 'Thành phẩm', sequence: 4 },
                ],
            },
        },
    });

    const product2 = await prisma.product.upsert({
        where: { code: 'TUI-KRAFT-002' },
        update: {},
        create: {
            code: 'TUI-KRAFT-002',
            name: 'Túi Kraft Nâu',
            description: 'Túi giấy Kraft nâu loại 1, quai xoắn',
            templates: {
                create: [
                    { name: 'In', sequence: 1 },
                    { name: 'Bế', sequence: 2 },
                    { name: 'Thành phẩm', sequence: 3 },
                ],
            },
        },
    });

    console.log('✅ Products & Templates created');

    // ─── Create Sample Production Orders ──────────────────────
    const order1 = await prisma.productionOrder.upsert({
        where: { orderCode: 'LSX-2026-001' },
        update: {},
        create: {
            orderCode: 'LSX-2026-001',
            productCode: product1.code,
            productId: product1.id,
            customer: 'Công ty TNHH ABC',
            plannedQty: 10000,
            dueDate: new Date('2026-05-10'),
            status: 'IN_PROGRESS',
            notes: 'Hộp giấy A4, in offset 4 màu',
            operations: {
                create: [
                    { name: 'In', sequence: 1, status: 'COMPLETED' },
                    { name: 'Bế', sequence: 2, status: 'IN_PROGRESS' },
                    { name: 'Cán', sequence: 3, status: 'WAITING' },
                    { name: 'Thành phẩm', sequence: 4, status: 'WAITING' },
                ],
            },
        },
        include: { operations: true },
    });

    const order2 = await prisma.productionOrder.upsert({
        where: { orderCode: 'LSX-2026-002' },
        update: {},
        create: {
            orderCode: 'LSX-2026-002',
            productCode: product2.code,
            productId: product2.id,
            customer: 'Siêu thị XYZ',
            plannedQty: 5000,
            dueDate: new Date('2026-04-28'),
            status: 'PENDING',
            notes: 'Túi kraft, in flexo 2 màu',
            operations: {
                create: [
                    { name: 'In', sequence: 1 },
                    { name: 'Bế', sequence: 2 },
                    { name: 'Thành phẩm', sequence: 3 },
                ],
            },
        },
        include: { operations: true },
    });

    const order3 = await prisma.productionOrder.upsert({
        where: { orderCode: 'LSX-2026-003' },
        update: {},
        create: {
            orderCode: 'LSX-2026-003',
            productCode: 'NHAN-DAN-003',
            customer: 'Dược phẩm DEF',
            plannedQty: 50000,
            dueDate: new Date('2026-04-25'),
            status: 'IN_PROGRESS',
            notes: 'Nhãn dán, in offset UV',
            operations: {
                create: [
                    { name: 'In', sequence: 1, status: 'COMPLETED' },
                    { name: 'Cán', sequence: 2, status: 'COMPLETED' },
                    { name: 'Bế', sequence: 3, status: 'IN_PROGRESS' },
                    { name: 'Thành phẩm', sequence: 4, status: 'WAITING' },
                ],
            },
        },
        include: { operations: true },
    });

    console.log('✅ Sample orders created:', {
        order1: order1.orderCode,
        order2: order2.orderCode,
        order3: order3.orderCode,
    });

    // ─── Create Sample Production Logs ────────────────────────
    if (order1.operations.length > 0) {
        const printOp = order1.operations.find(op => op.name === 'In');
        if (printOp) {
            await prisma.productionLog.createMany({
                data: [
                    {
                        operationId: printOp.id,
                        userId: worker.id,
                        okQty: 3000,
                        ngQty: 50,
                        startTime: new Date('2026-04-24T08:00:00'),
                        endTime: new Date('2026-04-24T12:00:00'),
                        notes: 'Ca sáng',
                    },
                    {
                        operationId: printOp.id,
                        userId: worker.id,
                        okQty: 3500,
                        ngQty: 30,
                        startTime: new Date('2026-04-24T13:00:00'),
                        endTime: new Date('2026-04-24T17:00:00'),
                        notes: 'Ca chiều',
                    },
                    {
                        operationId: printOp.id,
                        userId: worker.id,
                        okQty: 3500,
                        ngQty: 20,
                        startTime: new Date('2026-04-25T08:00:00'),
                        endTime: new Date('2026-04-25T12:00:00'),
                        notes: 'Ca sáng ngày 2',
                    },
                ],
            });

            // Sample NG ranges
            await prisma.ngRange.createMany({
                data: [
                    { operationId: printOp.id, rangeStart: 1001, rangeEnd: 1020, reason: 'Lệch mực' },
                    { operationId: printOp.id, rangeStart: 2050, rangeEnd: 2080, reason: 'Giấy nhăn' },
                ],
            });
        }
    }

    console.log('✅ Sample logs and NG ranges created');
    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Default login credentials:');
    console.log('  Admin:   admin / 1');
    console.log('  Manager: manager1 / 1');
    console.log('  Worker:  worker1 / 1');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
