import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
    },
    {
        path: '',
        loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
        canActivate: [authGuard],
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
            },
            {
                path: 'orders',
                loadComponent: () => import('./features/orders/orders-list/orders-list.component').then(m => m.OrdersListComponent),
                canActivate: [roleGuard],
                data: { roles: ['admin', 'manager'] },
            },
            {
                path: 'orders/:id',
                loadComponent: () => import('./features/orders/order-detail/order-detail.component').then(m => m.OrderDetailComponent),
                canActivate: [roleGuard],
                data: { roles: ['admin', 'manager'] },
            },
            {
                path: 'production',
                loadComponent: () => import('./features/production/production-input/production-input.component').then(m => m.ProductionInputComponent),
            },
            {
                path: 'account-settings',
                loadComponent: () => import('./features/account-settings/account-settings.component').then(m => m.AccountSettingsComponent),
            },
            {
                path: 'admin/users',
                loadComponent: () => import('./features/admin/users/users.component').then(m => m.UsersComponent),
                canActivate: [roleGuard],
                data: { roles: ['admin'] },
            },
            {
                path: 'admin/master-data',
                loadComponent: () => import('./features/admin/products/products.component').then(m => m.ProductsComponent),
                canActivate: [roleGuard],
                data: { roles: ['admin', 'manager'] },
            },
            {
                path: 'reports',
                loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
                canActivate: [roleGuard],
                data: { roles: ['admin', 'manager'] },
            },
            {
                path: 'materials',
                loadComponent: () => import('./features/materials/materials.component').then(m => m.MaterialsComponent),
                canActivate: [roleGuard],
                data: { roles: ['admin', 'manager'] },
            },
            {
                path: 'hr',
                loadComponent: () => import('./features/hr/hr.component').then(m => m.HrComponent),
                canActivate: [roleGuard],
                data: { roles: ['admin', 'manager', 'worker'] },
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full',
            },
        ],
    },
    { path: '**', redirectTo: 'dashboard' },
];
