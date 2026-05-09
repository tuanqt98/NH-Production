import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="odoo-layout" [class.is-home]="isHome">
      <!-- ─── Odoo Top Navigation Bar ─── -->
      <nav class="odoo-navbar">
        <div class="navbar-left">
          <a class="navbar-brand" routerLink="/dashboard">
            <div class="brand-icon">NH</div>
            <span class="brand-name" *ngIf="!isHome">{{currentModuleName}}</span>
            <span class="brand-name" *ngIf="isHome">NH Production</span>
          </a>

          <!-- Module nav links (shown when NOT on home) -->
          <div class="navbar-modules" *ngIf="!isHome">
            <a *ngFor="let item of currentModuleNav"
               [routerLink]="item.route"
               routerLinkActive="active"
               class="module-nav-link">
              {{item.name}}
            </a>
          </div>
        </div>

        <div class="navbar-right">
          <button class="navbar-icon-btn" title="Tìm kiếm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
          <button class="navbar-icon-btn" title="Thông báo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>

          <div class="navbar-user" (click)="toggleUserMenu()">
            <div class="user-avatar-sm">{{userInitials}}</div>
            <span class="user-name-sm">{{userName}}</span>
          </div>

          <!-- User dropdown -->
          <div class="user-dropdown" *ngIf="showUserMenu">
            <a class="dropdown-item" routerLink="/dashboard">
              <span>🏠</span> Trang chủ
            </a>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item logout-item" (click)="logout()">
              <span>🚪</span> Đăng xuất
            </a>
          </div>
        </div>
      </nav>

      <!-- ─── Sidebar (shown when NOT on home) ─── -->
      <div class="layout-body">
        <aside class="odoo-sidebar" *ngIf="false">
          <nav class="sidebar-nav">
            <div class="nav-group" *ngFor="let section of menuItems">
              <div class="nav-group-label">{{section.label}}</div>
              <a *ngFor="let item of section.children"
                 [routerLink]="item.route"
                 routerLinkActive="active"
                 class="sidebar-link">
                <span class="link-icon">{{item.icon}}</span>
                <span class="link-text">{{item.name}}</span>
              </a>
            </div>
          </nav>
        </aside>

        <!-- ─── Main Content ─── -->
        <main class="odoo-content" [class.full-width]="isHome">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    /* ─── Layout Container ─────────────────────────── */
    .odoo-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--bg-main, #F0F0F0);
      font-family: 'Inter', sans-serif;
    }

    /* ─── Navbar — Odoo Purple ─────────────────────── */
    .odoo-navbar {
      height: 46px;
      background: var(--odoo-purple, #714B67);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      flex-shrink: 0;
      z-index: 1000;
      position: relative;
    }

    .navbar-left {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
    }

    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      padding: 4px 12px 4px 4px;
      border-radius: 4px;
      transition: background 0.15s;
    }
    .navbar-brand:hover {
      background: rgba(255,255,255,0.1);
      text-decoration: none;
    }

    .brand-icon {
      width: 30px;
      height: 30px;
      background: rgba(255,255,255,0.2);
      color: #fff;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 11px;
      font-family: 'Outfit', sans-serif;
      flex-shrink: 0;
    }

    .brand-name {
      color: #fff;
      font-weight: 600;
      font-size: 14px;
      font-family: 'Outfit', sans-serif;
      white-space: nowrap;
    }

    /* Module sub-navigation in navbar */
    .navbar-modules {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-left: 8px;
    }

    .module-nav-link {
      color: rgba(255,255,255,0.75);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 4px;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .module-nav-link:hover {
      color: #fff;
      background: rgba(255,255,255,0.1);
      text-decoration: none;
    }
    .module-nav-link.active {
      color: #fff;
      background: rgba(255,255,255,0.15);
      font-weight: 600;
    }

    /* Navbar Right */
    .navbar-right {
      display: flex;
      align-items: center;
      gap: 4px;
      position: relative;
    }

    .navbar-icon-btn {
      width: 34px;
      height: 34px;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.8);
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .navbar-icon-btn:hover {
      background: rgba(255,255,255,0.12);
      color: #fff;
    }

    .navbar-user {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px 4px 4px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s;
      margin-left: 4px;
    }
    .navbar-user:hover {
      background: rgba(255,255,255,0.1);
    }

    .user-avatar-sm {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 11px;
    }

    .user-name-sm {
      color: #fff;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
    }

    /* User dropdown */
    .user-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      background: #fff;
      border: 1px solid #DEE2E6;
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      min-width: 180px;
      z-index: 1001;
      padding: 4px;
      animation: dropIn 0.15s ease;
    }

    @keyframes dropIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      font-size: 13px;
      color: #495057;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.1s;
    }
    .dropdown-item:hover {
      background: #F4F6F8;
      text-decoration: none;
      color: #212529;
    }

    .logout-item:hover { color: #DC3545; }

    .dropdown-divider {
      height: 1px;
      background: #E9ECEF;
      margin: 4px 0;
    }

    /* ─── Layout Body ──────────────────────────────── */
    .layout-body {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    /* ─── Sidebar ──────────────────────────────────── */
    .odoo-sidebar {
      width: 240px;
      background: #FFFFFF;
      border-right: 1px solid #DEE2E6;
      overflow-y: auto;
      flex-shrink: 0;
    }

    .sidebar-nav {
      padding: 8px;
    }

    .nav-group {
      margin-bottom: 4px;
    }

    .nav-group-label {
      font-size: 10px;
      font-weight: 700;
      color: #ADB5BD;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      padding: 16px 12px 6px 12px;
    }

    .sidebar-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      color: #495057;
      text-decoration: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.1s;
      margin-bottom: 1px;
    }
    .sidebar-link:hover {
      background: #F4F6F8;
      color: #212529;
      text-decoration: none;
    }
    .sidebar-link.active {
      background: var(--primary-light, #F3EDF2);
      color: var(--odoo-purple, #714B67);
      font-weight: 600;
    }

    .link-icon {
      font-size: 16px;
      width: 22px;
      text-align: center;
      flex-shrink: 0;
    }

    .link-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ─── Main Content ─────────────────────────────── */
    .odoo-content {
      flex: 1;
      overflow-y: auto;
      background: var(--bg-main, #F0F0F0);
    }

    .odoo-content.full-width {
      width: 100%;
    }

    /* Home override: hide sidebar */
    .is-home .odoo-sidebar { display: none; }
  `]
})
export class LayoutComponent implements OnInit {
  isHome = false;
  userName = 'Admin';
  userInitials = 'AD';
  currentModuleName = 'Tổng quan';
  showUserMenu = false;
  currentModuleNav: { name: string; route: string }[] = [];

  menuItems = [
    {
      label: 'Kinh doanh',
      children: [
        { name: 'Báo giá & Bán hàng', route: '/sales', icon: '📋' },
        { name: 'Khách hàng', route: '/customers', icon: '👥' }
      ]
    },
    {
      label: 'Sản xuất',
      children: [
        { name: 'Thiết kế', route: '/design', icon: '🎨' },
        { name: 'Kế hoạch SX', route: '/planning', icon: '📅' }
      ]
    },
    {
      label: 'Hệ thống',
      children: [
        { name: 'Nhân sự & Chấm công', route: '/hr', icon: '👤' },
        { name: 'Báo cáo', route: '/reports', icon: '📊' }
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

    // Close dropdown on outside click
    document.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.navbar-user') && !target.closest('.user-dropdown')) {
        this.showUserMenu = false;
      }
    });
  }

  updateState() {
    const url = this.router.url;
    this.isHome = url === '/dashboard' || url === '/';
    if (url.includes('/sales')) this.currentModuleName = 'Bán hàng';
    else if (url.includes('/customers')) this.currentModuleName = 'Khách hàng';
    else if (url.includes('/design')) this.currentModuleName = 'Thiết kế';
    else if (url.includes('/planning')) this.currentModuleName = 'Kế hoạch SX';
    else if (url.includes('/hr')) this.currentModuleName = 'Nhân sự';
    else if (url.includes('/attendance')) this.currentModuleName = 'Chấm công';
    else if (url.includes('/reports')) this.currentModuleName = 'Báo cáo';
    else this.currentModuleName = 'Tổng quan';
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  logout() {
    this.api.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  toggleProfile() {}
}
