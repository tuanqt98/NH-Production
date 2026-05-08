import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="app-container" [class.is-home]="isHome">
      <!-- SIDEBAR -->
      <aside class="app-sidebar" *ngIf="!isHome">
        <div class="sidebar-logo">
          <div class="logo-icon">NH</div>
          <span class="logo-text">NH Production</span>
        </div>
        
        <nav class="sidebar-nav">
          <div class="nav-section" *ngFor="let section of menuItems">
            <div class="section-header">{{section.label}}</div>
            <a *ngFor="let item of section.children" 
               [routerLink]="item.route" 
               routerLinkActive="active"
               class="nav-link">
              <span class="nav-icon">{{item.icon}}</span>
              <span class="nav-label">{{item.name}}</span>
            </a>
          </div>
        </nav>

        <div class="sidebar-footer">
           <div class="user-info" (click)="toggleProfile()">
             <div class="user-avatar">{{userInitials}}</div>
             <div class="user-details">
               <div class="u-name">{{userName}}</div>
               <div class="u-role">Administrator</div>
             </div>
           </div>
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <div class="main-wrapper">
        <header class="top-header" *ngIf="!isHome">
          <div class="header-left">
            <h1 class="page-title">{{currentModuleName}}</h1>
          </div>
          <div class="header-right">
            <div class="header-search">
              <span class="search-icon">🔍</span>
              <input type="text" placeholder="Tìm kiếm...">
            </div>
            <button class="icon-btn" title="Thông báo">🔔</button>
            <button class="icon-btn" (click)="logout()" title="Đăng xuất">🚪</button>
          </div>
        </header>

        <main class="content-area">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    /* ─── Container ─────────────────────────────────────── */
    .app-container { display: flex; height: 100vh; background: var(--bg-main); font-family: 'Inter', sans-serif; }
    
    /* ─── Sidebar — Odoo Style ──────────────────────────── */
    .app-sidebar { 
      width: 260px; background: #FFFFFF; color: var(--text-main);
      display: flex; flex-direction: column; z-index: 100;
      border-right: 1px solid var(--border-light);
      box-shadow: 1px 0 4px rgba(0,0,0,0.04);
    }

    .sidebar-logo { 
      padding: 20px 20px; display: flex; align-items: center; gap: 12px;
      border-bottom: 1px solid var(--border-light);
    }
    .logo-icon { 
      width: 36px; height: 36px; background: var(--primary); color: white;
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 14px; font-family: 'Outfit', sans-serif;
    }
    .logo-text { font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 800; color: var(--text-main); }

    .sidebar-nav { flex: 1; padding: 12px; overflow-y: auto; }
    .section-header { 
      font-size: 10px; font-weight: 700; color: var(--text-light); 
      text-transform: uppercase; letter-spacing: 1.5px;
      margin: 24px 12px 8px 12px;
    }
    .nav-link { 
      display: flex; align-items: center; gap: 12px; padding: 10px 14px;
      color: var(--text-muted); text-decoration: none; border-radius: 6px;
      font-size: 13px; font-weight: 500; transition: all 0.15s ease;
      margin-bottom: 2px;
    }
    .nav-link:hover { background: #F4F6F8; color: var(--text-main); }
    .nav-link.active { 
      background: var(--primary-light, #E8F8F9); color: var(--primary); font-weight: 600;
      border-left: 3px solid var(--primary); margin-left: -3px;
    }
    .nav-icon { font-size: 18px; width: 24px; text-align: center; }

    .sidebar-footer { padding: 16px; border-top: 1px solid var(--border-light); }
    .user-info { 
      display: flex; align-items: center; gap: 10px; padding: 8px;
      border-radius: 8px; cursor: pointer; transition: all 0.15s;
    }
    .user-info:hover { background: #F4F6F8; }
    .user-avatar { 
      width: 36px; height: 36px; border-radius: 50%; 
      background: var(--primary); color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px;
    }
    .u-name { font-size: 13px; font-weight: 600; color: var(--text-main); }
    .u-role { font-size: 11px; color: var(--text-muted); }

    /* ─── Main Content ──────────────────────────────────── */
    .main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    
    .top-header { 
      height: 56px; padding: 0 24px; display: flex; justify-content: space-between; align-items: center;
      background: #FFFFFF; border-bottom: 1px solid var(--border-light);
      box-shadow: 0 1px 3px rgba(0,0,0,0.04); z-index: 90;
    }
    .page-title { font-family: 'Outfit'; font-size: 18px; font-weight: 700; color: var(--text-main); }
    
    .header-right { display: flex; align-items: center; gap: 12px; }
    .header-search { position: relative; }
    .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; }
    .header-search input { 
      background: #F4F6F8; border: 1px solid var(--border-light); 
      padding: 8px 14px 8px 36px; border-radius: 6px; width: 240px; font-size: 13px; outline: none;
      color: var(--text-main); transition: all 0.2s;
    }
    .header-search input::placeholder { color: var(--text-light); }
    .header-search input:focus { border-color: var(--primary); background: #fff; box-shadow: 0 0 0 3px rgba(14,154,167,0.1); }
    
    .icon-btn { 
      background: #F4F6F8; border: 1px solid var(--border-light); 
      width: 36px; height: 36px; border-radius: 6px; cursor: pointer; color: var(--text-muted);
      display: flex; align-items: center; justify-content: center; font-size: 16px;
      transition: all 0.15s;
    }
    .icon-btn:hover { background: #E8EAED; color: var(--text-main); border-color: var(--border-hover); }

    .content-area { flex: 1; overflow-y: auto; background: var(--bg-main); }

    /* Home Override */
    .is-home .app-sidebar { display: none; }
  `]
})
export class LayoutComponent implements OnInit {
  isHome = false;
  userName = 'Admin';
  userInitials = 'AD';
  currentModuleName = 'Dashboard';

  menuItems = [
    {
      label: 'Kinh doanh',
      children: [
        { name: 'Báo giá & Bán hàng', route: '/sales', icon: '💎' },
        { name: 'Khách hàng', route: '/customers', icon: '🤝' }
      ]
    },
    {
      label: 'Sản xuất',
      children: [
        { name: 'Thiết kế', route: '/design', icon: '⚙️' },
        { name: 'Kế hoạch', route: '/planning', icon: '🎯' }
      ]
    },
    {
      label: 'Hệ thống',
      children: [
        { name: 'Nhân sự', route: '/hr', icon: '👤' },
        { name: 'Báo cáo', route: '/reports', icon: '📈' }
      ]
    }
  ];

  constructor(private router: Router, private api: ApiService) {
    this.router.events.subscribe(() => {
      this.updateState();
    });
  }

  ngOnInit() {
    const user = this.api.getCurrentUser();
    if (user) {
      this.userName = user.fullName;
      this.userInitials = user.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    }
    this.updateState();
  }

  updateState() {
    const url = this.router.url;
    this.isHome = url === '/dashboard' || url === '/';
    if (url.includes('/sales')) this.currentModuleName = 'Báo giá & Bán hàng';
    else if (url.includes('/customers')) this.currentModuleName = 'Khách hàng';
    else if (url.includes('/design')) this.currentModuleName = 'Thiết kế kỹ thuật';
    else if (url.includes('/planning')) this.currentModuleName = 'Kế hoạch sản xuất';
    else if (url.includes('/hr')) this.currentModuleName = 'Quản lý nhân sự';
    else if (url.includes('/reports')) this.currentModuleName = 'Báo cáo & Phân tích';
    else this.currentModuleName = 'Tổng quan';
  }

  logout() {
    this.api.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  toggleProfile() {}
}
