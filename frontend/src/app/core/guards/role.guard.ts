import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    const requiredRoles = route.data?.['roles'] as string[] || [];

    if (requiredRoles.length === 0) {
        return true;
    }

    if (auth.hasRole(...requiredRoles)) {
        return true;
    }

    toast.error('Bạn không có quyền truy cập trang này');
    router.navigate(['/dashboard']);
    return false;
};
