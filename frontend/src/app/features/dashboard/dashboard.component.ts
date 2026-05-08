import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

interface AppConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    route: string;
    color: string;
    badgeCount?: number;
    category: string;
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div class="dashboard-page">
        <div class="dashboard-content">
            <!-- Header -->
            <header class="dash-header">
                <div class="welcome-section">
                    <h1>Xin chào, {{userName}} 👋</h1>
                    <p>Chào mừng trở lại hệ thống quản lý NH Production</p>
                </div>
                <div class="header-right">
                    <div class="user-card">
                        <div class="avatar">{{userInitials}}</div>
                        <div class="user-meta">
                            <span class="name">{{userName}}</span>
                            <span class="role">Administrator</span>
                        </div>
                    </div>
                </div>
            </header>

            <!-- App Grid -->
            <div class="apps-container">
                <div class="category-section" *ngFor="let cat of categories">
                    <h2 class="section-title">{{cat}}</h2>
                    <div class="apps-grid">
                        <div *ngFor="let app of getAppsByCategory(cat)" 
                             class="app-card" 
                             [routerLink]="app.route">
                            <div class="app-icon" [style.background]="app.color">
                                <span>{{app.icon}}</span>
                                <div class="badge" *ngIf="app.badgeCount">{{app.badgeCount}}</div>
                            </div>
                            <div class="app-info">
                                <span class="app-name">{{app.name}}</span>
                                <span class="app-desc">{{app.description}}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    styles: [`
        .dashboard-page { 
            min-height: 100vh; width: 100%; background: #F0F4F8;
            font-family: 'Inter', sans-serif;
        }

        .dashboard-content { padding: 48px 64px; max-width: 1400px; margin: 0 auto; }

        /* Header */
        .dash-header { 
            display: flex; justify-content: space-between; align-items: center; 
            margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid #DEE2E6;
        }
        .welcome-section h1 { 
            font-family: 'Outfit'; font-size: 32px; font-weight: 800; 
            color: #212529; margin-bottom: 6px; 
        }
        .welcome-section p { color: #6C757D; font-size: 15px; }

        .user-card { 
            display: flex; align-items: center; gap: 12px; 
            padding: 10px 20px 10px 10px; border-radius: 12px;
            background: #FFFFFF; border: 1px solid #DEE2E6;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .avatar { 
            width: 42px; height: 42px; border-radius: 50%; 
            background: #0E9AA7; color: white;
            display: flex; align-items: center; justify-content: center;
            font-weight: 700; font-size: 15px;
        }
        .user-meta { display: flex; flex-direction: column; }
        .user-meta .name { font-weight: 700; font-size: 14px; color: #212529; }
        .user-meta .role { font-size: 12px; color: #6C757D; }

        /* Category Sections */
        .apps-container { display: flex; flex-direction: column; gap: 40px; }
        .section-title { 
            font-size: 11px; font-weight: 700; color: #ADB5BD; 
            text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px;
            padding-bottom: 8px; border-bottom: 1px solid #E8EAED;
        }
        
        .apps-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        
        /* App Cards — Odoo Style */
        .app-card { 
            background: #FFFFFF; border: 1px solid #DEE2E6;
            border-radius: 12px; padding: 20px; cursor: pointer; 
            display: flex; align-items: center; gap: 16px;
            transition: all 0.2s ease; text-decoration: none;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .app-card:hover { 
            border-color: #0E9AA7; 
            box-shadow: 0 4px 16px rgba(14, 154, 167, 0.12);
            transform: translateY(-2px);
        }

        .app-icon { 
            width: 52px; height: 52px; border-radius: 12px; 
            display: flex; align-items: center; justify-content: center; 
            font-size: 24px; position: relative; flex-shrink: 0;
        }
        .badge { 
            position: absolute; top: -6px; right: -6px; 
            background: #DB2828; color: #fff;
            font-size: 10px; font-weight: 800; 
            padding: 2px 7px; border-radius: 10px; 
            border: 2px solid #fff;
            min-width: 20px; text-align: center;
        }

        .app-info { display: flex; flex-direction: column; gap: 2px; }
        .app-name { color: #212529; font-weight: 700; font-size: 15px; }
        .app-desc { color: #6C757D; font-size: 12px; }

        @media (max-width: 768px) {
            .dashboard-content { padding: 24px 16px; }
            .dash-header { flex-direction: column; align-items: flex-start; gap: 16px; }
            .apps-grid { grid-template-columns: 1fr; }
        }
    `]
})
export class DashboardComponent implements OnInit {
    userName = 'Admin';
    userInitials = 'AD';
    categories: string[] = ['Kinh doanh', 'Sản xuất', 'Hệ thống'];
    apps: AppConfig[] = [
        { id: 'sales', name: 'Báo giá & Bán hàng', description: 'Quản lý đơn hàng và báo giá', icon: '💎', route: '/sales', color: '#EBF5FB', badgeCount: 0, category: 'Kinh doanh' },
        { id: 'customers', name: 'Khách hàng', description: 'Quản lý thông tin khách hàng', icon: '🤝', route: '/customers', color: '#EAFAF1', category: 'Kinh doanh' },
        { id: 'design', name: 'Thiết kế kỹ thuật', description: 'Bản vẽ và thiết kế sản phẩm', icon: '⚙️', route: '/design', color: '#F4ECF7', badgeCount: 0, category: 'Sản xuất' },
        { id: 'planning', name: 'Kế hoạch sản xuất', description: 'Lập kế hoạch và theo dõi tiến độ', icon: '🎯', route: '/planning', color: '#EAFAF1', badgeCount: 0, category: 'Sản xuất' },
        { id: 'hr', name: 'Nhân sự & Chấm công', description: 'Quản lý nhân viên và chấm công', icon: '👤', route: '/hr', color: '#E8F8F9', category: 'Hệ thống' },
        { id: 'all-orders', name: 'Tất cả đơn hàng', description: 'Xem toàn bộ đơn hàng', icon: '📦', route: '/orders', color: '#F4F6F8', category: 'Hệ thống' },
        { id: 'reports', name: 'Báo cáo & Phân tích', description: 'Thống kê và phân tích dữ liệu', icon: '📊', route: '/reports', color: '#EBF5FB', category: 'Hệ thống' }
    ];

    constructor(private api: ApiService, private router: Router) {}

    getAppsByCategory(cat: string) {
        return this.apps.filter(a => a.category === cat);
    }

    ngOnInit() {
        const user = this.api.getCurrentUser();
        if (user) {
            this.userName = user.fullName;
            this.userInitials = user.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
        }
        this.updateBadges();
    }

    updateBadges() {
        this.api.getOrdersByDepartment('sales').subscribe(res => {
            const app = this.apps.find(a => a.id === 'sales');
            if (app) app.badgeCount = res.data?.length || 0;
        });
        this.api.getOrdersByDepartment('design').subscribe(res => {
            const app = this.apps.find(a => a.id === 'design');
            if (app) app.badgeCount = res.data?.length || 0;
        });
        this.api.getOrdersByDepartment('planning').subscribe(res => {
            const app = this.apps.find(a => a.id === 'planning');
            if (app) app.badgeCount = res.data?.length || 0;
        });
    }
}
