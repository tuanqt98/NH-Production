import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProductionSummary {
    period: string;
    okQty: number;
    ngQty: number;
    totalQty: number;
    totalHours: number;
    ngRate: string;
    productivity: number;
    logCount: number;
}

export interface WorkerProductivity {
    userId: number;
    username: string;
    fullName: string;
    okQty: number;
    ngQty: number;
    totalQty: number;
    totalHours: number;
    productivityPerHour: number;
    ngRate: string;
    logCount: number;
    operations: string[];
}

export interface OrderCompletion {
    orderCode: string;
    productCode: string;
    customer: string;
    status: string;
    plannedQty: number;
    actualOk: number;
    actualNg: number;
    completionPercent: number;
    operationsTotal: number;
    operationsCompleted: number;
    dueDate: string;
    isOverdue: boolean;
}

export interface NgAnalysis {
    byOperation: { operationName: string; okQty: number; ngQty: number; ngRate: string }[];
    byProduct: { productCode: string; okQty: number; ngQty: number; ngRate: string }[];
    byReason: { reason: string; count: number; totalQty: number }[];
}

export interface OEEData {
    availability: number;
    performance: number;
    quality: number;
    oee: number;
    details: {
        totalRunTimeHours: number;
        plannedTimeHours: number;
        totalProduced: number;
        totalOk: number;
        totalNg: number;
        actualRatePerHour: number;
    };
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
    private apiUrl = `${environment.apiUrl}/reports`;

    constructor(private http: HttpClient) { }

    getProductionSummary(startDate: string, endDate: string, groupBy: string = 'day'): Observable<ApiResponse<ProductionSummary[]>> {
        const params = new HttpParams()
            .set('startDate', startDate)
            .set('endDate', endDate)
            .set('groupBy', groupBy);
        return this.http.get<ApiResponse<ProductionSummary[]>>(`${this.apiUrl}/production-summary`, { params, withCredentials: true });
    }

    getWorkerProductivity(startDate: string, endDate: string): Observable<ApiResponse<WorkerProductivity[]>> {
        const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
        return this.http.get<ApiResponse<WorkerProductivity[]>>(`${this.apiUrl}/worker-productivity`, { params, withCredentials: true });
    }

    getOrderCompletion(): Observable<ApiResponse<OrderCompletion[]>> {
        return this.http.get<ApiResponse<OrderCompletion[]>>(`${this.apiUrl}/order-completion`, { withCredentials: true });
    }

    getNgAnalysis(startDate: string, endDate: string): Observable<ApiResponse<NgAnalysis>> {
        const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
        return this.http.get<ApiResponse<NgAnalysis>>(`${this.apiUrl}/ng-analysis`, { params, withCredentials: true });
    }

    getOEE(startDate: string, endDate: string): Observable<ApiResponse<OEEData>> {
        const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
        return this.http.get<ApiResponse<OEEData>>(`${this.apiUrl}/oee`, { params, withCredentials: true });
    }

    exportExcel(type: string, startDate: string, endDate: string): void {
        const params = `?type=${type}&startDate=${startDate}&endDate=${endDate}`;
        window.open(`${this.apiUrl}/export${params}`, '_blank');
    }
}
