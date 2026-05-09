import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

interface AppConfig {
    id: string;
    name: string;
    icon: string;
    route: string;
    gradient: string;
    badgeCount?: number;
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div class="odoo-home">
      <div class="apps-area">
        <div class="apps-grid">
          <a *ngFor="let app of apps"
             [routerLink]="app.route"
             class="app-tile">
            <div class="tile-icon" [style.background]="app.gradient">
              <span class="tile-emoji">{{app.icon}}</span>
              <div class="tile-badge" *ngIf="app.badgeCount && app.badgeCount > 0">
                {{app.badgeCount > 99 ? '99+' : app.badgeCount}}
              </div>
            </div>
            <span class="tile-name">{{app.name}}</span>
          </a>
        </div>
      </div>
    </div>
    `,
    styles: [`
        .odoo-home {
            min-height: 100%;
            width: 100%;
            background: linear-gradient(
              180deg,
              #E8E0E6 0%,
              #EDECF0 40%,
              #F0F0F0 100%
            );
            display: flex;
            align-items: flex-start;
            justify-content: center;
            font-family: 'Inter', sans-serif;
        }

        .apps-area {
            padding: 56px 40px;
            max-width: 960px;
            width: 100%;
        }

        .apps-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 8px 4px;
            justify-items: center;
        }

        .app-tile {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            padding: 16px 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.2s ease;
            width: 130px;
        }

        .app-tile:hover {
            background: rgba(255,255,255,0.6);
            transform: translateY(-2px);
            text-decoration: none;
        }

        .tile-icon {
            width: 64px;
            height: 64px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: box-shadow 0.2s, transform 0.2s;
        }

        .app-tile:hover .tile-icon {
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            transform: scale(1.05);
        }

        .tile-emoji {
            font-size: 28px;
            line-height: 1;
        }

        .tile-badge {
            position: absolute;
            top: -6px;
            right: -6px;
            background: #E8453C;
            color: #fff;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 10px;
            min-width: 18px;
            text-align: center;
            border: 2px solid #fff;
            line-height: 1.3;
        }

        .tile-name {
            font-size: 12px;
            font-weight: 500;
            color: #495057;
            text-align: center;
            line-height: 1.3;
            max-width: 110px;
            word-wrap: break-word;
        }

        .app-tile:hover .tile-name {
            color: #212529;
        }

        @media (max-width: 900px) {
            .apps-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (max-width: 600px) {
            .apps-area { padding: 32px 16px; }
            .apps-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
            .app-tile { width: 100px; padding: 12px 4px; }
            .tile-icon { width: 52px; height: 52px; border-radius: 12px; }
            .tile-emoji { font-size: 24px; }
        }
    `]
})
export class DashboardComponent implements OnInit {
    userName = 'Admin';
    userInitials = 'AD';

    apps: AppConfig[] = [
        // ── Row 1: Kinh doanh ──
        { id: 'crm', name: 'CRM', icon: '💼', route: '/customers', gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)' },
        { id: 'sales', name: 'Bán hàng', icon: '📋', route: '/sales', gradient: 'linear-gradient(135deg, #6366F1, #4F46E5)', badgeCount: 0 },
        { id: 'customers', name: 'Liên hệ', icon: '👥', route: '/customers', gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)' },
        { id: 'quotation', name: 'Báo giá', icon: '📝', route: '/sales', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
        { id: 'orders', name: 'Đơn hàng', icon: '📦', route: '/sales', gradient: 'linear-gradient(135deg, #10B981, #059669)', badgeCount: 0 },
        { id: 'accounting', name: 'Kế toán', icon: '🧾', route: '/reports', gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },

        // ── Row 2: Sản xuất ──
        { id: 'design', name: 'Thiết kế', icon: '🎨', route: '/design', gradient: 'linear-gradient(135deg, #F472B6, #DB2777)', badgeCount: 0 },
        { id: 'prepress', name: 'Chế bản', icon: '🖨️', route: '/design', gradient: 'linear-gradient(135deg, #FB923C, #EA580C)' },
        { id: 'planning', name: 'Kế hoạch SX', icon: '📅', route: '/planning', gradient: 'linear-gradient(135deg, #34D399, #059669)', badgeCount: 0 },
        { id: 'production', name: 'Sản xuất', icon: '🏭', route: '/planning', gradient: 'linear-gradient(135deg, #60A5FA, #2563EB)' },
        { id: 'warehouse', name: 'BP Kho', icon: '📥', route: '/planning', gradient: 'linear-gradient(135deg, #FBBF24, #B45309)' },
        { id: 'qc', name: 'BP QC', icon: '✅', route: '/planning', gradient: 'linear-gradient(135deg, #2DD4BF, #0D9488)' },

        // ── Row 3: Nhân sự ──
        { id: 'hr', name: 'Nhân viên', icon: '👤', route: '/hr', gradient: 'linear-gradient(135deg, #FB7185, #E11D48)' },
        { id: 'attendance', name: 'Chấm công', icon: '⏰', route: '/attendance', gradient: 'linear-gradient(135deg, #38BDF8, #0284C7)' },
        { id: 'payroll', name: 'Bảng lương', icon: '💰', route: '/hr', gradient: 'linear-gradient(135deg, #A3E635, #65A30D)' },
        { id: 'leave', name: 'Nghỉ phép', icon: '🏖️', route: '/hr', gradient: 'linear-gradient(135deg, #C084FC, #9333EA)' },
        { id: 'recruitment', name: 'Tuyển dụng', icon: '🔍', route: '/hr', gradient: 'linear-gradient(135deg, #22D3EE, #0891B2)' },
        { id: 'staffing', name: 'Bố trí nhân sự SX', icon: '🗂️', route: '/hr', gradient: 'linear-gradient(135deg, #F97316, #C2410C)' },

        // ── Row 4: Hệ thống & Báo cáo ──
        { id: 'reports', name: 'Báo cáo', icon: '📊', route: '/reports', gradient: 'linear-gradient(135deg, #60A5FA, #2563EB)' },
        { id: 'kpi', name: 'KPI', icon: '🎯', route: '/reports', gradient: 'linear-gradient(135deg, #4ADE80, #16A34A)' },
        { id: 'documents', name: 'Tài liệu', icon: '📁', route: '/dashboard', gradient: 'linear-gradient(135deg, #94A3B8, #64748B)' },
        { id: 'approval', name: 'Phê duyệt', icon: '✍️', route: '/dashboard', gradient: 'linear-gradient(135deg, #FB923C, #EA580C)' },
        { id: 'alerts', name: 'Cảnh báo SX', icon: '🚨', route: '/planning', gradient: 'linear-gradient(135deg, #F87171, #DC2626)' },
        { id: 'settings', name: 'Cài đặt', icon: '⚙️', route: '/dashboard', gradient: 'linear-gradient(135deg, #78716C, #57534E)' },
    ];

    constructor(private api: ApiService, private router: Router) {}

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
            const orders = this.apps.find(a => a.id === 'orders');
            if (orders) orders.badgeCount = res.data?.length || 0;
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
