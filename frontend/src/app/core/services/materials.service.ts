import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Material {
    id: number;
    code: string;
    name: string;
    unit: string;
    category: string;
    minStock: number;
    currentStock: number;
    unitPrice?: number;
    supplier?: string;
    createdAt: string;
    updatedAt: string;
}

export type TransactionType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface StockTransaction {
    id: number;
    materialId: number;
    type: TransactionType;
    quantity: number;
    orderId?: number;
    reason?: string;
    createdBy: number;
    createdAt: string;
    material?: { name: string; code: string; unit: string };
    user?: { fullName: string };
    order?: { orderCode: string };
}

export interface MaterialRequirement {
    id: number;
    orderId: number;
    materialId: number;
    requiredQty: number;
    issuedQty: number;
    material?: Material;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

@Injectable({ providedIn: 'root' })
export class MaterialsService {
    private materialsUrl = `${environment.apiUrl}/materials`;
    private stockUrl = `${environment.apiUrl}/stock`;

    constructor(private http: HttpClient) { }

    // ─── Materials CRUD ─────────────────────────────────────────

    getMaterials(category?: string, search?: string): Observable<ApiResponse<Material[]>> {
        let params = new HttpParams();
        if (category) params = params.set('category', category);
        if (search) params = params.set('search', search);
        return this.http.get<ApiResponse<Material[]>>(this.materialsUrl, { params, withCredentials: true });
    }

    getMaterial(id: number): Observable<ApiResponse<Material>> {
        return this.http.get<ApiResponse<Material>>(`${this.materialsUrl}/${id}`, { withCredentials: true });
    }

    createMaterial(data: Partial<Material>): Observable<ApiResponse<Material>> {
        return this.http.post<ApiResponse<Material>>(this.materialsUrl, data, { withCredentials: true });
    }

    updateMaterial(id: number, data: Partial<Material>): Observable<ApiResponse<Material>> {
        return this.http.put<ApiResponse<Material>>(`${this.materialsUrl}/${id}`, data, { withCredentials: true });
    }

    deleteMaterial(id: number): Observable<ApiResponse<any>> {
        return this.http.delete<ApiResponse<any>>(`${this.materialsUrl}/${id}`, { withCredentials: true });
    }

    getCategories(): Observable<ApiResponse<string[]>> {
        return this.http.get<ApiResponse<string[]>>(`${this.materialsUrl}/categories`, { withCredentials: true });
    }

    getAlerts(): Observable<ApiResponse<Material[]>> {
        return this.http.get<ApiResponse<Material[]>>(`${this.materialsUrl}/alerts`, { withCredentials: true });
    }

    // ─── Stock Transactions ──────────────────────────────────────

    createTransaction(data: {
        materialId: number;
        type: TransactionType;
        quantity: number;
        orderId?: number;
        reason?: string;
    }): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.stockUrl}/transactions`, data, { withCredentials: true });
    }

    getStockHistory(filters: { materialId?: number; type?: string; orderId?: number }): Observable<ApiResponse<StockTransaction[]>> {
        let params = new HttpParams();
        if (filters.materialId) params = params.set('materialId', filters.materialId.toString());
        if (filters.type) params = params.set('type', filters.type);
        if (filters.orderId) params = params.set('orderId', filters.orderId.toString());
        return this.http.get<ApiResponse<StockTransaction[]>>(`${this.stockUrl}/history`, { params, withCredentials: true });
    }

    getOrderRequirements(orderId: number): Observable<ApiResponse<MaterialRequirement[]>> {
        return this.http.get<ApiResponse<MaterialRequirement[]>>(`${this.stockUrl}/requirements/${orderId}`, { withCredentials: true });
    }

    addRequirement(data: { orderId: number; materialId: number; requiredQty: number }): Observable<ApiResponse<MaterialRequirement>> {
        return this.http.post<ApiResponse<MaterialRequirement>>(`${this.stockUrl}/requirements`, data, { withCredentials: true });
    }
}
