import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    meta?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

@Injectable({ providedIn: 'root' })
export class ApiService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('user') || 'null');
        } catch {
            return null;
        }
    }

    logout(): Observable<any> {
        localStorage.removeItem('user');
        return this.http.post(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true });
    }

    // ─── Orders ────────────────────────────────────────────
    getOrders(params?: any): Observable<ApiResponse> {
        let httpParams = new HttpParams();
        if (params) {
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== '') {
                    httpParams = httpParams.set(key, params[key]);
                }
            });
        }
        return this.http.get<ApiResponse>(`${this.baseUrl}/orders`, { params: httpParams, withCredentials: true });
    }

    getOrder(id: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/orders/${id}`, { withCredentials: true });
    }

    createOrder(data: any): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/orders`, data, { withCredentials: true });
    }

    updateOrder(id: number, data: any): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.baseUrl}/orders/${id}`, data, { withCredentials: true });
    }

    deleteOrder(id: number): Observable<any> {
        return this.http.delete(`${this.baseUrl}/orders/${id}`, { withCredentials: true });
    }

    // ─── Workflow ──────────────────────────────────────────
    workflowTransition(id: number, action: string, note?: string): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/orders/${id}/workflow/${action}`, { note }, { withCredentials: true });
    }

    updateDesign(id: number, data: any): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.baseUrl}/orders/${id}/design`, data, { withCredentials: true });
    }

    updatePlanning(id: number, data: any): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.baseUrl}/orders/${id}/planning`, data, { withCredentials: true });
    }

    getOrderHistory(id: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/orders/${id}/history`, { withCredentials: true });
    }

    getOrdersByDepartment(view: string): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/orders/department/${view}`, { withCredentials: true });
    }

    // ─── Production Logs ──────────────────────────────────
    createLog(data: any): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/logs`, data, { withCredentials: true });
    }

    getLogsByOperation(operationId: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/logs/operation/${operationId}`, { withCredentials: true });
    }

    // ─── NG Tracking ──────────────────────────────────────
    createNgRange(data: any): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/ng/ranges`, data, { withCredentials: true });
    }

    checkNgNumber(number: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/ng/check/${number}`, { withCredentials: true });
    }

    getNgByOperation(operationId: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/ng/operation/${operationId}`, { withCredentials: true });
    }

    // ─── Dashboard ────────────────────────────────────────
    getDashboardSummary(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/dashboard/summary`, { withCredentials: true });
    }

    getDailyOutput(days?: number): Observable<ApiResponse> {
        const params = days ? new HttpParams().set('days', days) : undefined;
        return this.http.get<ApiResponse>(`${this.baseUrl}/dashboard/daily-output`, { params, withCredentials: true });
    }

    getOverdueOrders(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/dashboard/overdue`, { withCredentials: true });
    }

    getBottleneck(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/dashboard/bottleneck`, { withCredentials: true });
    }

    getNgRate(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/dashboard/ng-rate`, { withCredentials: true });
    }

    // ─── Customers ─────────────────────────────────────────
    getCustomers(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/customers`, { withCredentials: true });
    }



    importCustomers(file: File): Observable<ApiResponse> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<ApiResponse>(`${this.baseUrl}/customers/import`, formData, { withCredentials: true });
    }

    createCustomer(data: any): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/customers`, data, { withCredentials: true });
    }

    getCustomer(id: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/customers/${id}`, { withCredentials: true });
    }

    updateCustomer(id: number, data: any): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.baseUrl}/customers/${id}`, data, { withCredentials: true });
    }

    deleteCustomer(id: number): Observable<any> {
        return this.http.delete(`${this.baseUrl}/customers/${id}`, { withCredentials: true });
    }

    bulkDeleteCustomers(ids: number[]): Observable<any> {
        return this.http.post(`${this.baseUrl}/customers/delete-bulk`, { ids }, { withCredentials: true });
    }

    searchCustomers(query: string): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/customers/search`, { 
            params: new HttpParams().set('q', query),
            withCredentials: true 
        });
    }
}
