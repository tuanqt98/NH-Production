import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TitleCasePipe],
  template: `
    <div class="app-layout">
      <!-- Sidebar -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed">
        <div class="sidebar-header">
          <div class="logo" (click)="sidebarCollapsed = !sidebarCollapsed">
            <span class="logo-icon">NH</span>
            @if (!sidebarCollapsed) {
              <span class="logo-text">Production</span>
            }
          </div>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📊</span>
            @if (!sidebarCollapsed) { <span class="nav-label">Dashboard</span> }
          </a>

          @if (auth.isAdmin() || auth.isManager()) {
            <a routerLink="/orders" routerLinkActive="active" class="nav-item">
              <span class="nav-icon">📋</span>
              @if (!sidebarCollapsed) { <span class="nav-label">Lệnh SX</span> }
            </a>
          }

          <a routerLink="/production" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">⚙️</span>
            @if (!sidebarCollapsed) { <span class="nav-label">Nhập SL</span> }
          </a>

          @if (auth.isAdmin() || auth.isManager()) {
            <a routerLink="/admin/master-data" routerLinkActive="active" class="nav-item">
              <span class="nav-icon">📦</span>
              @if (!sidebarCollapsed) { <span class="nav-label">Sản phẩm</span> }
            </a>
          }

          @if (auth.isAdmin()) {
            <a routerLink="/admin/users" routerLinkActive="active" class="nav-item">
              <span class="nav-icon">👥</span>
              @if (!sidebarCollapsed) { <span class="nav-label">Người dùng</span> }
            </a>
          }

          @if (auth.isAdmin() || auth.isManager()) {
            <a routerLink="/reports" routerLinkActive="active" class="nav-item">
              <span class="nav-icon">📈</span>
              @if (!sidebarCollapsed) { <span class="nav-label">Báo cáo</span> }
            </a>

            <a routerLink="/materials" routerLinkActive="active" class="nav-item">
              <span class="nav-icon">📦</span>
              @if (!sidebarCollapsed) { <span class="nav-label">Vật tư & Kho</span> }
            </a>
          }

          <a routerLink="/hr" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📅</span>
            @if (!sidebarCollapsed) { 
              <span class="nav-label">{{ auth.isWorker() ? 'Chấm công' : 'Nhân sự' }}</span> 
            }
          </a>

          <div class="nav-divider"></div>

          <a routerLink="/account-settings" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">👤</span>
            @if (!sidebarCollapsed) { <span class="nav-label">Tài khoản</span> }
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-info" [routerLink]="['/account-settings']" style="cursor: pointer;">
            <div class="user-avatar">
              @if (auth.user()?.avatarUrl) {
                <img [src]="auth.getFullUrl(auth.user()?.avatarUrl)" alt="Avatar">
              } @else {
                <span>{{ getInitials() }}</span>
              }
            </div>
            @if (!sidebarCollapsed) {
              <div class="user-details">
                <span class="user-name">{{ auth.user()?.fullName }}</span>
                <span class="user-role">{{ auth.user()?.role?.name | titlecase }}</span>
              </div>
            }
          </div>
          <button class="btn-logout" (click)="auth.logout()" title="Đăng xuất">
            🚪
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      min-height: 100vh;
    }

    .sidebar {
      width: var(--sidebar-width);
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      transition: width var(--transition-normal);
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 100;
    }

    .sidebar.collapsed {
      width: 72px;
    }

    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid var(--border-color);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      background: var(--accent-gradient);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.9rem;
      color: white;
      flex-shrink: 0;
    }

    .logo-text {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-bright);
      white-space: nowrap;
    }

    .sidebar-nav {
      flex: 1;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      transition: all var(--transition-fast);
      text-decoration: none;
    }

    .nav-item:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .nav-item.active {
      background: var(--bg-active);
      color: var(--text-bright);
    }

    .nav-icon {
      font-size: 1.2rem;
      width: 24px;
      text-align: center;
      flex-shrink: 0;
    }

    .nav-label {
      font-size: 0.9rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      overflow: hidden;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--bg-active);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.8rem;
      color: var(--text-bright);
      flex-shrink: 0;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .user-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .nav-divider {
      height: 1px;
      background: rgba(255,255,255,0.05);
      margin: 8px 14px;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .user-name {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .btn-logout {
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 8px;
      border-radius: var(--radius-sm);
      transition: background var(--transition-fast);
    }

    .btn-logout:hover {
      background: var(--bg-hover);
    }

    .main-content {
      flex: 1;
      margin-left: var(--sidebar-width);
      transition: margin-left var(--transition-normal);
      min-height: 100vh;
    }

    .sidebar.collapsed + .main-content,
    .sidebar.collapsed ~ .main-content {
      margin-left: 72px;
    }

    @media (max-width: 768px) {
      .sidebar {
        width: 72px;
      }
      .main-content {
        margin-left: 72px;
      }
    }
  `],
})
export class LayoutComponent {
  sidebarCollapsed = false;

  constructor(public auth: AuthService) { }

  getInitials(): string {
    const name = this.auth.user()?.fullName || '';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }
}
