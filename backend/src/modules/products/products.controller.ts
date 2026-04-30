import { Request, Response } from 'express';
import { ProductsService } from './products.service';

const productsService = new ProductsService();

export class ProductsController {
    async getAll(req: Request, res: Response) {
        try {
            const products = await productsService.getAllProducts();
            res.json({ success: true, data: products });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getOne(req: Request, res: Response) {
        try {
            const productId = parseInt(req.params.id as string);
            const product = await productsService.getProductById(productId);
            if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
            res.json({ success: true, data: product });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const product = await productsService.createProduct(req.body);
            res.status(201).json({ success: true, data: product });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const productId = parseInt(req.params.id as string);
            const product = await productsService.updateProduct(productId, req.body);
            res.json({ success: true, data: product });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const productId = parseInt(req.params.id as string);
            await productsService.deleteProduct(productId);
            res.json({ success: true, message: 'Product deleted successfully' });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}
