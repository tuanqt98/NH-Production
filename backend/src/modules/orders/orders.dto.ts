import Joi from 'joi';

export const createOrderSchema = Joi.object({
    orderCode: Joi.string().max(50).required(),
    productCode: Joi.string().max(50).required(),
    customer: Joi.string().max(200).required(),
    plannedQty: Joi.number().integer().positive().required(),
    dueDate: Joi.date().iso().required(),
    notes: Joi.string().max(1000).optional().allow(''),
    operations: Joi.array().items(
        Joi.object({
            name: Joi.string().valid('In', 'Bế', 'Cán', 'Thành phẩm').required(),
            sequence: Joi.number().integer().positive().required(),
        })
    ).min(1).required(),
});

export const updateOrderSchema = Joi.object({
    productCode: Joi.string().max(50).optional(),
    customer: Joi.string().max(200).optional(),
    plannedQty: Joi.number().integer().positive().optional(),
    dueDate: Joi.date().iso().optional(),
    status: Joi.string().valid('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED').optional(),
    notes: Joi.string().max(1000).optional().allow(''),
});

export const queryOrdersSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('orderCode', 'dueDate', 'status', 'createdAt').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    status: Joi.string().valid('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE').optional(),
    customer: Joi.string().optional(),
    search: Joi.string().optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
});
