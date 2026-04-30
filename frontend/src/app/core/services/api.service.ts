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
}
