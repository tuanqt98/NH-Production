import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '../types';

export function sendSuccess<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200,
    meta?: PaginationMeta
): void {
    const response: ApiResponse<T> = {
        success: true,
        message,
        data,
    };
    if (meta) response.meta = meta;
    res.status(statusCode).json(response);
}

export function sendError(
    res: Response,
    message: string,
    statusCode = 400,
    errors?: any
): void {
    const response: ApiResponse = {
        success: false,
        message,
    };
    if (errors) response.data = errors;
    res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T, message = 'Created successfully'): void {
    sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response): void {
    res.status(204).send();
}
