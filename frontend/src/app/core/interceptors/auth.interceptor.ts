import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    // Always send cookies
    const authReq = req.clone({ withCredentials: true });

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/refresh')) {
                if (!isRefreshing) {
                    isRefreshing = true;
                    return auth.refreshToken().pipe(
                        switchMap(() => {
                            isRefreshing = false;
                            return next(authReq);
                        }),
                        catchError(refreshError => {
                            isRefreshing = false;
                            auth.logout();
                            return throwError(() => refreshError);
                        })
                    );
                }
            }

            if (error.status === 403) {
                toast.error('Bạn không có quyền thực hiện thao tác này');
            }

            if (error.status === 422) {
                const details = error.error?.data;
                if (details && Array.isArray(details)) {
                    details.forEach((d: any) => toast.error(d.message));
                }
            }

            if (error.status >= 500) {
                toast.error('Lỗi hệ thống. Vui lòng thử lại sau.');
            }

            return throwError(() => error);
        })
    );
};
