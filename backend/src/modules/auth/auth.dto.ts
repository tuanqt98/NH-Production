import Joi from 'joi';

export const loginSchema = Joi.object({
    username: Joi.string().min(3).max(50).required(),
    password: Joi.string().min(1).max(128).required(),
});

export const registerSchema = Joi.object({
    username: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(1).max(128).required(),
    fullName: Joi.string().min(2).max(100).required(),
    roleId: Joi.number().integer().positive().required(),
});
