import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

interface AppConfig {
    id: string;
    name: string;
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
        <div class="mesh-bg"></div>

        <div class="dashboard-content">
            <header class="dashboard-header">
                <div class="welcome-text">
                    <h1>Xin chào, {{userName}} 👋</h1>
                    <p>Chào mừng trở lại với hệ thống quản lý NH Production.</p>
                </div>
                <div class="header-actions">
                    <button class="glass-btn">🔍</button>
                    <button class="glass-btn">🔔 <span class="dot"></span></button>
                    <div class="user-pill">
                        <img [src]="'https://ui-avatars.com/api/?name=' + userName + '&background=6366f1&color=fff'" alt="avatar">
                        <span>{{userName}}</span>
                    </div>
                </div>
            </header>

            <div class="apps-container">
                <div class="category-section" *ngFor="let cat of categories">
                    <h2 class="section-title">{{cat}}</h2>
                    <div class="apps-flex">
                        <div *ngFor="let app of getAppsByCategory(cat)" 
                             class="glass-app-card" 
                             [routerLink]="app.route"
                             [style.--app-color]="app.color">
                            <div class="app-icon-box">
                                <span class="app-icon">{{app.icon}}</span>
                                <div class="badge-mini" *ngIf="app.badgeCount">{{app.badgeCount}}</div>
                            </div>
                            <div class="app-info">
                                <span class="app-label">{{app.name}}</span>
                                <span class="app-desc">Manage {{app.id}} data</span>
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
            min-height: 100vh; width: 100vw; background: var(--bg-main); position: relative; 
            overflow-x: hidden; font-family: 'Inter', sans-serif;
        }

        .mesh-bg {
            position: fixed; width: 100%; height: 100%;
            background-image: var(--mesh-gradient);
            filter: blur(120px); opacity: 0.6; z-index: 0;
            transform: scale(1.1);
        }

        .dashboard-content { position: relative; z-index: 1; padding: 80px 100px; max-width: 1600px; margin: 0 auto; }

        .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 80px; }
        .welcome-text h1 { font-family: 'Outfit'; font-size: 42px; font-weight: 800; color: #fff; margin-bottom: 12px; letter-spacing: -1px; }
        .welcome-text p { color: var(--text-muted); font-size: 18px; font-weight: 500; }

        .header-actions { display: flex; align-items: center; gap: 20px; }
        .glass-btn { 
            width: 54px; height: 54px; border-radius: 18px; border: 1px solid var(--glass-border);
            background: var(--glass-bg); backdrop-filter: blur(20px); color: #fff; cursor: pointer;
            display: flex; align-items: center; justify-content: center; font-size: 22px; position: relative;
            transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .glass-btn:hover { background: rgba(255,255,255,0.15); transform: translateY(-4px) scale(1.05); border-color: rgba(255,255,255,0.4); }

        .user-pill { 
            display: flex; align-items: center; gap: 14px; padding: 8px 24px 8px 8px;
            background: var(--glass-bg); backdrop-filter: blur(20px); border: 1px solid var(--glass-border);
            border-radius: 40px; color: #fff; font-weight: 700; font-size: 15px;
            box-shadow: var(--shadow-md);
        }
        .user-pill img { width: 42px; height: 42px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); }

        .apps-container { display: flex; flex-direction: column; gap: 64px; }
        .section-title { font-family: 'Outfit'; font-size: 13px; font-weight: 900; color: var(--primary); text-transform: uppercase; letter-spacing: 3px; margin-bottom: 32px; opacity: 0.8; }
        
        .apps-flex { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 32px; }
        
        .glass-app-card { 
            background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(30px); border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 32px; padding: 32px; cursor: pointer; display: flex; align-items: center; gap: 24px;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative; overflow: hidden;
        }
        .glass-app-card::before {
            content: ""; position: absolute; inset: 0; background: var(--glass-shine); opacity: 0; transition: opacity 0.4s;
        }
        .glass-app-card:hover { 
            background: rgba(255, 255, 255, 0.08); transform: translateY(-10px) scale(1.02); 
            border-color: var(--primary); box-shadow: 0 30px 60px rgba(0,0,0,0.5);
        }
        .glass-app-card:hover::before { opacity: 1; }

        .app-icon-box { 
            width: 72px; height: 72px; background: #fff; border-radius: 22px; 
            display: flex; align-items: center; justify-content: center; font-size: 36px;
            position: relative; z-index: 1; transition: transform 0.4s;
        }
        .glass-app-card:hover .app-icon-box { transform: rotate(-5deg) scale(1.1); }
        
        .app-icon-box::after { 
            content: ""; position: absolute; inset: -4px; border-radius: 26px; 
            background: var(--app-color); opacity: 0.2; filter: blur(8px);
        }
        
        .badge-mini { 
            position: absolute; top: -10px; right: -10px; background: var(--accent); color: #fff;
            font-size: 11px; font-weight: 900; padding: 4px 10px; border-radius: 14px; border: 3px solid #fff;
            box-shadow: 0 4px 10px rgba(244, 63, 94, 0.4);
        }

        .app-info { display: flex; flex-direction: column; gap: 4px; z-index: 1; }
        .app-label { color: #fff; font-weight: 800; font-size: 20px; font-family: 'Outfit'; }
        .app-desc { color: var(--text-muted); font-size: 14px; font-weight: 500; }
    `]
})
export class DashboardComponent implements OnInit {
    userName = 'Admin';
    categories: string[] = ['Kinh doanh', 'Sản xuất', 'Hệ thống'];
    apps: AppConfig[] = [
        { id: 'sales', name: 'BP KD', icon: '💎', route: '/sales', color: '#4f46e5', badgeCount: 3, category: 'Kinh doanh' },
        { id: 'customers', name: 'Khách hàng', icon: '🤝', route: '/customers', color: '#10b981', category: 'Kinh doanh' },
        { id: 'design', name: 'Thiết kế', icon: '⚙️', route: '/design', color: '#818cf8', badgeCount: 2, category: 'Sản xuất' },
        { id: 'planning', name: 'Kế hoạch', icon: '🎯', route: '/planning', color: '#10b981', badgeCount: 5, category: 'Sản xuất' },
        { id: 'hr', name: 'Nhân viên', icon: '👤', route: '/hr', color: '#f43f5e', category: 'Hệ thống' },
        { id: 'all-orders', name: 'Tất cả đơn', icon: '📦', route: '/orders', color: '#64748b', category: 'Hệ thống' },
        { id: 'products', name: 'Sản phẩm', icon: '🔨', route: '/products', color: '#8b5cf6', category: 'Hệ thống' },
        { id: 'reports', name: 'Báo cáo', icon: '📊', route: '/reports', color: '#3b82f6', category: 'Hệ thống' }
    ];

    constructor(private api: ApiService, private router: Router) {}

    getAppsByCategory(cat: string) {
        return this.apps.filter(a => a.category === cat);
    }

    ngOnInit() {
        const user = this.api.getCurrentUser();
        if (user) this.userName = user.fullName;
        this.updateBadges();
    }

    updateBadges() {
        // Sau này sẽ gọi API để cập nhật số lượng badge thực tế
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
