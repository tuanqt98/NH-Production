import { prisma } from '../../config/database.config';
import { OrderStatus } from '@prisma/client';
import { logger } from '../../config/logger.config';

// ─── Workflow State Machine ─────────────────────────────────
// Defines valid transitions: fromStatus → toStatus + who can do it

interface Transition {
    toStatus: OrderStatus;
    action: string;
    allowedRoles: string[];       // role names
    allowedDepartments?: string[]; // department names (optional extra check)
    requiredFields?: string[];     // fields that must exist before transition
}

const WORKFLOW_TRANSITIONS: Record<string, Transition[]> = {
    // NV Kinh doanh tạo → gửi duyệt giá
    [OrderStatus.QUOTATION]: [{
        toStatus: OrderStatus.PRICE_PROPOSAL,
        action: 'submit_price',
        allowedRoles: ['admin', 'manager', 'worker'],
        allowedDepartments: ['Kinh Doanh', 'Kinh doanh'],
    }],

    // TP Kinh doanh duyệt giá
    [OrderStatus.PRICE_PROPOSAL]: [
        {
            toStatus: OrderStatus.AWAITING_CONFIRM,
            action: 'approve_price',
            allowedRoles: ['admin', 'manager'],
        },
        {
            toStatus: OrderStatus.CONFIRMED,
            action: 'design_confirm',
            allowedRoles: ['admin', 'manager', 'worker'],
        }
    ],

    // TP Kinh doanh xác nhận đơn hàng (sau khi TK đã bổ sung)
    [OrderStatus.AWAITING_CONFIRM]: [
        {
            toStatus: OrderStatus.SALES_ORDER,
            action: 'confirm_order',
            allowedRoles: ['admin', 'manager'],
        },
        {
            toStatus: OrderStatus.CONFIRMED,
            action: 'design_confirm',
            allowedRoles: ['admin', 'manager', 'worker'],
        }
    ],

    // Đã là đơn bán hàng → Thiết kế xác nhận để vào sản xuất
    [OrderStatus.SALES_ORDER]: [{
        toStatus: OrderStatus.CONFIRMED,
        action: 'design_confirm',
        allowedRoles: ['admin', 'manager', 'worker'],
    }],

    // Hệ thống tự sinh Lệnh SX → BP Kế hoạch xác nhận
    [OrderStatus.CONFIRMED]: [{
        toStatus: OrderStatus.IN_PROGRESS,
        action: 'plan_confirm',
        allowedRoles: ['admin', 'manager'],
    }],

    // Hoàn thành sản xuất
    [OrderStatus.IN_PROGRESS]: [{
        toStatus: OrderStatus.COMPLETED,
        action: 'mark_complete',
        allowedRoles: ['admin', 'manager'],
    }],
};

export class WorkflowService {
    /**
     * Transition an order to the next status
     */
    async transition(orderId: number, action: string, userId: number, note?: string) {
        return prisma.$transaction(async (tx) => {
            // 1. Get order
            const order = await tx.productionOrder.findFirst({
                where: { id: orderId, isDeleted: false },
            });
            if (!order) throw new Error('Đơn hàng không tồn tại');

            // 2. Get user with role & department
            const user = await tx.user.findUnique({
                where: { id: userId },
                include: { role: true, department: true },
            });
            if (!user) throw new Error('Người dùng không tồn tại');

            // 3. Find valid transition
            const transitions = WORKFLOW_TRANSITIONS[order.status];
            if (!transitions) throw new Error(`Trạng thái "${order.status}" không thể chuyển tiếp`);

            const transition = transitions.find(t => t.action === action);
            if (!transition) throw new Error(`Hành động "${action}" không hợp lệ cho trạng thái "${order.status}"`);

            // 4. Check role permission
            const userRole = user.role.name.toLowerCase();
            if (!transition.allowedRoles.includes(userRole)) {
                throw new Error(`Bạn không có quyền thực hiện thao tác này (yêu cầu: ${transition.allowedRoles.join(', ')})`);
            }

            // 5. Build update data based on action
            const updateData: any = {
                status: transition.toStatus,
            };

            switch (action) {
                case 'submit_price':
                    // NV KD gửi duyệt → ghi lại ai gửi
                    break;
                case 'approve_price':
                    updateData.approvedBy = userId;
                    updateData.approvedDate = new Date();
                    break;
                case 'confirm_order':
                    updateData.confirmedBy = userId;
                    updateData.confirmedDate = new Date();
                    break;
                case 'plan_confirm':
                    updateData.planConfirmedAt = new Date();
                    break;
                case 'mark_complete':
                    break;
            }

            // 6. Update order status
            const updated = await tx.productionOrder.update({
                where: { id: orderId },
                data: updateData,
            });

            // 7. Log history
            await tx.orderHistory.create({
                data: {
                    orderId,
                    fromStatus: order.status,
                    toStatus: transition.toStatus,
                    action,
                    performedBy: userId,
                    note: note || null,
                },
            });

            logger.info(`Workflow: Order #${orderId} [${order.status} → ${transition.toStatus}] by User #${userId} (${action})`);

            return updated;
        });
    }

    /**
     * Update design info (BP Thiết kế)
     */
    async updateDesign(orderId: number, userId: number, data: {
        designMachine?: string;
        designTools?: any;
        designNote?: string;
    }) {
        const order = await prisma.productionOrder.findFirst({
            where: { id: orderId, isDeleted: false },
        });
        if (!order) throw new Error('Đơn hàng không tồn tại');
        if (order.status !== OrderStatus.AWAITING_CONFIRM) {
            throw new Error('Chỉ có thể cập nhật thiết kế khi đơn ở trạng thái "Chờ xác nhận"');
        }

        return prisma.productionOrder.update({
            where: { id: orderId },
            data: {
                designAssignee: userId,
                designMachine: data.designMachine,
                designTools: data.designTools,
                designNote: data.designNote,
                designDate: new Date(),
            },
        });
    }

    /**
     * Update planning info (BP Kế hoạch)
     */
    async updatePlanning(orderId: number, userId: number, data: {
        plannedStart?: string;
        plannedEnd?: string;
        planningNote?: string;
    }) {
        const order = await prisma.productionOrder.findFirst({
            where: { id: orderId, isDeleted: false },
        });
        if (!order) throw new Error('Đơn hàng không tồn tại');
        if (order.status !== OrderStatus.CONFIRMED) {
            throw new Error('Chỉ có thể cập nhật kế hoạch khi đơn ở trạng thái "Đã xác nhận"');
        }

        return prisma.productionOrder.update({
            where: { id: orderId },
            data: {
                planAssignee: userId,
                plannedStart: data.plannedStart ? new Date(data.plannedStart) : undefined,
                plannedEnd: data.plannedEnd ? new Date(data.plannedEnd) : undefined,
                planningNote: data.planningNote,
            },
        });
    }

    /**
     * Get workflow history for an order
     */
    async getHistory(orderId: number) {
        return prisma.orderHistory.findMany({
            where: { orderId },
            include: {
                user: { select: { id: true, fullName: true, department: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get orders filtered by department view
     */
    async getOrdersByDepartment(view: 'sales' | 'design' | 'planning' | 'production', userId?: number) {
        const statusFilter: Record<string, OrderStatus[]> = {
            sales: [OrderStatus.QUOTATION, OrderStatus.PRICE_PROPOSAL, OrderStatus.AWAITING_CONFIRM, OrderStatus.SALES_ORDER],
            design: [OrderStatus.AWAITING_CONFIRM, OrderStatus.SALES_ORDER, OrderStatus.PRICE_PROPOSAL],
            planning: [OrderStatus.CONFIRMED],
            production: [OrderStatus.IN_PROGRESS],
        };

        try {
            return await prisma.productionOrder.findMany({
                where: {
                    isDeleted: false,
                    status: { in: statusFilter[view] },
                },
                include: {
                    operations: {
                        select: { id: true, name: true, sequence: true },
                        orderBy: { sequence: 'asc' }
                    },
                    materialRequirements: { select: { id: true } },
                    history: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: {
                            id: true,
                            toStatus: true,
                            action: true,
                            createdAt: true,
                            user: { select: { fullName: true } }
                        }
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        } catch (error) {
            logger.error(`Error in getOrdersByDepartment (${view}):`, error);
            throw error;
        }
    }
}

export const workflowService = new WorkflowService();
