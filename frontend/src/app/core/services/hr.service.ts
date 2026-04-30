import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Department { id: number; name: string; description?: string; managerId?: number; users?: any[]; }
export interface Shift { id: number; name: string; startTime: string; endTime: string; description?: string; }
export interface Employee {
    id: number; username: string; fullName: string; email: string;
    phone?: string; position?: string; isActive: boolean; avatarUrl?: string;
    joinDate?: string; departmentId?: number; enrollNumber?: string;
    role?: { name: string }; department?: { name: string };
}
export interface AttendanceRecord {
    id: number; userId: number; date: string; shiftId?: number;
    checkIn?: string; checkOut?: string; status: string;
    overtimeHours: number; note?: string;
    user?: { id: number; fullName: string; position?: string; department?: { name: string } };
    shift?: { name: string };
}
export interface AttendanceSummary {
    userId: number; fullName: string; department: string;
    totalDays: number; presentDays: number; lateDays: number;
    absentDays: number; leaveDays: number; totalOT: number;
}

interface ApiRes<T> { success: boolean; data: T; message?: string; }

export interface AttendanceMachine { id: number; name: string; ip: string; port: number; isActive: boolean; lastSync?: string; }

@Injectable({ providedIn: 'root' })
export class HrService {
    private url = `${environment.apiUrl}/hr`;
    constructor(private http: HttpClient) { }

    // Departments
    getDepartments(): Observable<ApiRes<Department[]>> {
        return this.http.get<ApiRes<Department[]>>(`${this.url}/departments`, { withCredentials: true });
    }
    createDepartment(d: Partial<Department>): Observable<ApiRes<Department>> {
        return this.http.post<ApiRes<Department>>(`${this.url}/departments`, d, { withCredentials: true });
    }
    updateDepartment(id: number, d: Partial<Department>): Observable<ApiRes<Department>> {
        return this.http.put<ApiRes<Department>>(`${this.url}/departments/${id}`, d, { withCredentials: true });
    }
    deleteDepartment(id: number): Observable<ApiRes<any>> {
        return this.http.delete<ApiRes<any>>(`${this.url}/departments/${id}`, { withCredentials: true });
    }

    // Shifts
    getShifts(): Observable<ApiRes<Shift[]>> {
        return this.http.get<ApiRes<Shift[]>>(`${this.url}/shifts`, { withCredentials: true });
    }
    createShift(s: Partial<Shift>): Observable<ApiRes<Shift>> {
        return this.http.post<ApiRes<Shift>>(`${this.url}/shifts`, s, { withCredentials: true });
    }
    updateShift(id: number, s: Partial<Shift>): Observable<ApiRes<Shift>> {
        return this.http.put<ApiRes<Shift>>(`${this.url}/shifts/${id}`, s, { withCredentials: true });
    }
    deleteShift(id: number): Observable<ApiRes<any>> {
        return this.http.delete<ApiRes<any>>(`${this.url}/shifts/${id}`, { withCredentials: true });
    }

    // Employees
    getEmployees(filters?: { departmentId?: number; search?: string }): Observable<ApiRes<Employee[]>> {
        let params = new HttpParams();
        if (filters?.departmentId) params = params.set('departmentId', filters.departmentId.toString());
        if (filters?.search) params = params.set('search', filters.search);
        return this.http.get<ApiRes<Employee[]>>(`${this.url}/employees`, { params, withCredentials: true });
    }
    updateEmployee(id: number, d: any): Observable<ApiRes<Employee>> {
        return this.http.put<ApiRes<Employee>>(`${this.url}/employees/${id}`, d, { withCredentials: true });
    }
    deleteEmployee(id: number): Observable<ApiRes<any>> {
        return this.http.delete<ApiRes<any>>(`${this.url}/employees/${id}`, { withCredentials: true });
    }

    // Attendance
    checkIn(shiftId?: number): Observable<ApiRes<any>> {
        return this.http.post<ApiRes<any>>(`${this.url}/attendance/check-in`, { shiftId }, { withCredentials: true });
    }
    checkOut(): Observable<ApiRes<any>> {
        return this.http.post<ApiRes<any>>(`${this.url}/attendance/check-out`, {}, { withCredentials: true });
    }
    getAttendance(month: number, year: number, userId?: number): Observable<ApiRes<AttendanceRecord[]>> {
        let params = new HttpParams().set('month', month.toString()).set('year', year.toString());
        if (userId) params = params.set('userId', userId.toString());
        return this.http.get<ApiRes<AttendanceRecord[]>>(`${this.url}/attendance`, { params, withCredentials: true });
    }
    getAttendanceSummary(month: number, year: number): Observable<ApiRes<AttendanceSummary[]>> {
        const params = new HttpParams().set('month', month.toString()).set('year', year.toString());
        return this.http.get<ApiRes<AttendanceSummary[]>>(`${this.url}/attendance/summary`, { params, withCredentials: true });
    }
    updateAttendance(id: number, d: any): Observable<ApiRes<any>> {
        return this.http.put<ApiRes<any>>(`${this.url}/attendance/${id}`, d, { withCredentials: true });
    }

    // Machines
    getMachines(): Observable<ApiRes<AttendanceMachine[]>> {
        return this.http.get<ApiRes<AttendanceMachine[]>>(`${this.url}/machines`, { withCredentials: true });
    }
    saveMachine(m: Partial<AttendanceMachine>): Observable<ApiRes<AttendanceMachine>> {
        return this.http.post<ApiRes<AttendanceMachine>>(`${this.url}/machines`, m, { withCredentials: true });
    }
    deleteMachine(id: number): Observable<ApiRes<any>> {
        return this.http.delete<ApiRes<any>>(`${this.url}/machines/${id}`, { withCredentials: true });
    }
    syncMachines(): Observable<ApiRes<any>> {
        return this.http.post<ApiRes<any>>(`${this.url}/machines/sync`, {}, { withCredentials: true });
    }
    getMachineUsers(machineId: number): Observable<ApiRes<any>> {
        return this.http.get<ApiRes<any>>(`${this.url}/machines/${machineId}/users`, { withCredentials: true });
    }
    autoMapUsers(): Observable<ApiRes<any>> {
        return this.http.post<ApiRes<any>>(`${this.url}/machines/auto-map`, {}, { withCredentials: true });
    }
    getViolationReport(month: number, year: number): Observable<ApiRes<any>> {
        const params = new HttpParams().set('month', month.toString()).set('year', year.toString());
        return this.http.get<ApiRes<any>>(`${this.url}/violations/report`, { params, withCredentials: true });
    }
}
