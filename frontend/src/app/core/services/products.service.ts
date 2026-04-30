import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from './api.service';

export interface OperationTemplate {
    id?: number;
    name: string;
    sequence: number;
}

export interface Product {
    id: number;
    code: string;
    name: string;
    description: string;
    templates?: OperationTemplate[];
    createdAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class ProductsService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api/products';

    getProducts(): Observable<ApiResponse<Product[]>> {
        return this.http.get<ApiResponse<Product[]>>(this.apiUrl);
    }

    getProduct(id: number): Observable<ApiResponse<Product>> {
        return this.http.get<ApiResponse<Product>>(`${this.apiUrl}/${id}`);
    }

    createProduct(product: any): Observable<ApiResponse<Product>> {
        return this.http.post<ApiResponse<Product>>(this.apiUrl, product);
    }

    updateProduct(id: number, product: any): Observable<ApiResponse<Product>> {
        return this.http.put<ApiResponse<Product>>(`${this.apiUrl}/${id}`, product);
    }

    deleteProduct(id: number): Observable<ApiResponse<any>> {
        return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
    }
}
