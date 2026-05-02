import Joi from 'joi';

const ORDER_STATUSES = [
    'DRAFT', 'QUOTATION', 'PRICE_PROPOSAL', 'AWAITING_CONFIRM', 
    'CONFIRMED', 'SALES_ORDER', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE'
];

export const createOrderSchema = Joi.object({
    orderCode: Joi.string().max(50).required(),
    productCode: Joi.string().max(50).required(),
    productName: Joi.string().optional().allow(''),
    customer: Joi.string().max(200).required(),
    plannedQty: Joi.number().integer().positive().required(),
    dueDate: Joi.date().iso().required(),
    status: Joi.string().valid(...ORDER_STATUSES).optional(),
    
    // Basic Info
    salesAccountant: Joi.string().optional().allow(''),
    bomType: Joi.string().optional().allow(''),
    machineTarget: Joi.string().optional().allow(''),

    // Technical Specs
    length: Joi.number().optional().allow(null),
    width: Joi.number().optional().allow(null),
    height: Joi.number().optional().allow(null),
    printColors: Joi.number().integer().optional().allow(null),
    stepDistance: Joi.number().optional().allow(null),
    numItemsPerSet: Joi.number().integer().optional().allow(null),
    
    // Packaging
    packingMethod: Joi.string().optional().allow(''),
    unitPerPack: Joi.number().integer().optional().allow(null),
    unitName: Joi.string().optional().allow(''),
    packingSpecs: Joi.string().optional().allow(''),
    
    // Cost
    wastePercent: Joi.number().optional().default(0),

    notes: Joi.string().max(1000).optional().allow(''),
    operations: Joi.array().items(
        Joi.object({
            name: Joi.string().required(),
            sequence: Joi.number().integer().positive().required(),
        })
    ).min(1).required(),
});

export const updateOrderSchema = Joi.object({
    productCode: Joi.string().max(50).optional(),
    productName: Joi.string().optional().allow(''),
    customer: Joi.string().max(200).optional(),
    plannedQty: Joi.number().integer().positive().optional(),
    dueDate: Joi.date().iso().optional(),
    status: Joi.string().valid(...ORDER_STATUSES).optional(),
    
    // Detailed fields
    salesAccountant: Joi.string().optional().allow(''),
    bomType: Joi.string().optional().allow(''),
    machineTarget: Joi.string().optional().allow(''),
    length: Joi.number().optional().allow(null),
    width: Joi.number().optional().allow(null),
    height: Joi.number().optional().allow(null),
    printColors: Joi.number().integer().optional().allow(null),
    stepDistance: Joi.number().optional().allow(null),
    numItemsPerSet: Joi.number().integer().optional().allow(null),
    packingMethod: Joi.string().optional().allow(''),
    unitPerPack: Joi.number().integer().optional().allow(null),
    unitName: Joi.string().optional().allow(''),
    packingSpecs: Joi.string().optional().allow(''),
    wastePercent: Joi.number().optional(),
    mainMatUsage: Joi.number().optional(),
    subMatUsage: Joi.number().optional(),
    totalMaterialCost: Joi.number().optional(),

    notes: Joi.string().max(1000).optional().allow(''),

    operations: Joi.array().items(
        Joi.object({
            name: Joi.string().required(),
            sequence: Joi.number().integer().positive().required(),
        })
    ).optional(),
    materials: Joi.array().items(
        Joi.object({
            materialId: Joi.number().integer().positive().required(),
            quantity: Joi.number().positive().required(),
        })
    ).optional(),
});

export const queryOrdersSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('orderCode', 'dueDate', 'status', 'createdAt').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    status: Joi.string().valid(...ORDER_STATUSES).optional(),
    customer: Joi.string().optional(),
    search: Joi.string().optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
});
