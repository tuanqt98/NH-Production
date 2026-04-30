import Joi from 'joi';

export const createNgRangeSchema = Joi.object({
    operationId: Joi.number().integer().positive().required(),
    rangeStart: Joi.number().integer().min(0).required(),
    rangeEnd: Joi.number().integer().min(Joi.ref('rangeStart')).required(),
    reason: Joi.string().max(500).optional().allow(''),
});

export const checkNumberSchema = Joi.object({
    number: Joi.number().integer().min(0).required(),
});
