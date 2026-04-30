import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { sendError } from '../utils/response';

type ValidationTarget = 'body' | 'params' | 'query';

/**
 * Generic Joi validation middleware factory.
 * 
 * Usage:
 *   validate(loginSchema, 'body')
 *   validate(idParamSchema, 'params')
 */
export function validate(schema: Joi.ObjectSchema, target: ValidationTarget = 'body') {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error, value } = schema.validate(req[target], {
            abortEarly: false,      // Return all errors, not just the first
            stripUnknown: true,     // Remove unknown fields (security)
            allowUnknown: false,
        });

        if (error) {
            const details = error.details.map(d => ({
                field: d.path.join('.'),
                message: d.message.replace(/"/g, ''),
            }));

            sendError(res, 'Validation failed', 422, details);
            return;
        }

        // Replace with sanitized/validated values
        req[target] = value;
        next();
    };
}
