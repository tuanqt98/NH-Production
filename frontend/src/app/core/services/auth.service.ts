import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
    id: number;
    username: string;
    email: string;
    fullName: string;
    isActive: boolean;
    role: {
        id: number;
        name: string;
        permissions: string[];
    };
    avatarUrl?: string;
}

interface AuthResponse {
    success: boolean;
    message: string;
    data: {
        user: User;
    };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private apiUrl = `${environment.apiUrl}/auth`;

    // Signals for reactive state
    private currentUser = signal<User | null>(null);
    private isLoadingAuth = signal(true);

    user = this.currentUser.asReadonly();
    loading = this.isLoadingAuth.asReadonly();
    isLoggedIn = computed(() => !!this.currentUser());
    userRole = computed(() => this.currentUser()?.role?.name || '');
    isAdmin = computed(() => this.userRole() === 'admin');
    isManager = computed(() => this.userRole() === 'manager');
    isWorker = computed(() => this.userRole() === 'worker');

    constructor(private http: HttpClient, private router: Router) {
        this.checkAuth();
    }

    login(username: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { username, password }, { withCredentials: true })
            .pipe(
                tap(res => {
                    if (res.success && res.data?.user) {
                        this.currentUser.set(res.data.user);
                    }
                }),
                catchError(err => {
                    return throwError(() => err);
                })
            );
    }

    logout(): void {
        this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true })
            .subscribe({
                complete: () => {
                    this.currentUser.set(null);
                    this.router.navigate(['/login']);
                },
                error: () => {
                    this.currentUser.set(null);
                    this.router.navigate(['/login']);
                }
            });
    }

    refreshToken(): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, {}, { withCredentials: true })
            .pipe(
                tap(res => {
                    if (res.success && res.data?.user) {
                        this.currentUser.set(res.data.user);
                    }
                })
            );
    }

    checkAuth(): void {
        this.http.get<AuthResponse>(`${this.apiUrl}/me`, { withCredentials: true })
            .subscribe({
                next: (res) => {
                    if (res.success && res.data) {
                        this.currentUser.set(res.data as any);
                    }
                    this.isLoadingAuth.set(false);
                },
                error: () => {
                    this.currentUser.set(null);
                    this.isLoadingAuth.set(false);
                }
            });
    }

    hasRole(...roles: string[]): boolean {
        const role = this.userRole();
        return roles.includes(role);
    }

    updateUser(user: any): void {
        this.currentUser.set(user);
    }

    getFullUrl(url?: string): string {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `http://localhost:3000${url}`;
    }
}
