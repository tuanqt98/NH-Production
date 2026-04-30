import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from './api.service';

export interface Role {
    id: number;
    name: string;
    description: string;
}

export interface Department {
    id: number;
    name: string;
    description?: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
    fullName: string;
    roleId: number;
    departmentId?: number;
    isActive: boolean;
    role: Role;
    department?: Department;
    avatarUrl?: string;
    createdAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class UsersService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api/users';

    getUsers(): Observable<ApiResponse<User[]>> {
        return this.http.get<ApiResponse<User[]>>(this.apiUrl);
    }

    getRoles(): Observable<ApiResponse<Role[]>> {
        return this.http.get<ApiResponse<Role[]>>(`${this.apiUrl}/roles`);
    }

    createUser(user: any): Observable<ApiResponse<User>> {
        return this.http.post<ApiResponse<User>>(this.apiUrl, user);
    }

    updateUser(id: number, user: any): Observable<ApiResponse<User>> {
        return this.http.put<ApiResponse<User>>(`${this.apiUrl}/${id}`, user);
    }

    deleteUser(id: number): Observable<ApiResponse<any>> {
        return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
    }

    bulkDeleteUsers(ids: number[]): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.apiUrl}/bulk-delete`, { ids });
    }

    importUsers(file: File): Observable<ApiResponse<any>> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<ApiResponse<any>>(`${this.apiUrl}/import`, formData);
    }

    resetPassword(id: number): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${id}/reset-password`, {});
    }

    updateProfile(data: any): Observable<ApiResponse<User>> {
        return this.http.post<ApiResponse<User>>(`${this.apiUrl}/profile`, data);
    }

    uploadAvatar(file: File): Observable<ApiResponse<User>> {
        const formData = new FormData();
        formData.append('avatar', file);
        return this.http.post<ApiResponse<User>>(`${this.apiUrl}/upload-avatar`, formData);
    }
}
