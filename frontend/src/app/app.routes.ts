import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

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
                path: 'sales',
                loadComponent: () => import('./features/sales/sales.component').then(m => m.SalesOdooComponent),
            },
            {
                path: 'customers',
                loadComponent: () => import('./features/customers/customers.component').then(m => m.CustomersComponent),
            },
            {
                path: 'design',
                loadComponent: () => import('./features/design/design.component').then(m => m.DesignComponent),
            },
            {
                path: 'planning',
                loadComponent: () => import('./features/planning/planning.component').then(m => m.PlanningComponent),
            },
            {
                path: 'hr',
                loadComponent: () => import('./features/hr/hr.component').then(m => m.HrComponent),
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
