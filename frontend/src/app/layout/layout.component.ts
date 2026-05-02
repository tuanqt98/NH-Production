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
          <div class="logo-circle"></div>
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
             <img [src]="'https://ui-avatars.com/api/?name=' + userName + '&background=6366f1&color=fff'" alt="avatar">
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
              <input type="text" placeholder="Search anything...">
            </div>
            <button class="icon-btn">🔔</button>
            <button class="icon-btn" (click)="logout()">🚪</button>
          </div>
        </header>

        <main class="content-area">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-container { display: flex; height: 100vh; background: var(--bg-main); font-family: 'Inter', sans-serif; }
    
    /* Sidebar - Ultra Sharp */
    .app-sidebar { 
      width: 280px; background: #070b14; color: #fff;
      display: flex; flex-direction: column; z-index: 100;
      border-right: 1px solid rgba(255,255,255,0.05);
      box-shadow: 10px 0 30px rgba(0,0,0,0.5);
    }
    .sidebar-logo { padding: 32px 24px; display: flex; align-items: center; gap: 14px; }
    .logo-circle { 
        width: 36px; height: 36px; background: linear-gradient(135deg, var(--primary), #818cf8); 
        border-radius: 10px; transform: rotate(-5deg); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }
    .logo-text { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #fff; }

    .sidebar-nav { flex: 1; padding: 16px; overflow-y: auto; }
    .section-header { 
      font-family: 'Outfit'; font-size: 11px; font-weight: 900; color: var(--primary); 
      text-transform: uppercase; letter-spacing: 2px;
      margin: 32px 12px 16px 12px; opacity: 0.8;
    }
    .nav-link { 
      display: flex; align-items: center; gap: 14px; padding: 14px 18px;
      color: #94a3b8; text-decoration: none; border-radius: 16px;
      font-size: 14px; font-weight: 600; transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
      margin-bottom: 6px;
    }
    .nav-link:hover { background: rgba(255,255,255,0.05); color: #fff; transform: translateX(4px); }
    .nav-link.active { background: var(--primary); color: #fff; box-shadow: 0 8px 16px rgba(99, 102, 241, 0.4); }
    .nav-icon { font-size: 20px; }

    .sidebar-footer { padding: 24px; border-top: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); }
    .user-info { 
      display: flex; align-items: center; gap: 12px; padding: 10px;
      border-radius: 14px; cursor: pointer; transition: all 0.2s;
    }
    .user-info:hover { background: rgba(255,255,255,0.05); }
    .user-info img { width: 44px; height: 44px; border-radius: 14px; border: 2px solid rgba(255,255,255,0.1); }
    .u-name { font-size: 15px; font-weight: 700; color: #fff; }
    .u-role { font-size: 12px; color: #64748b; font-weight: 500; }

    /* Main Wrapper - Immersive Glass */
    .main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
    
    .top-header { 
      height: 90px; padding: 0 40px; display: flex; justify-content: space-between; align-items: center;
      background: rgba(10, 15, 29, 0.6); backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255,255,255,0.05); z-index: 90;
    }
    .page-title { font-family: 'Outfit'; font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    
    .header-right { display: flex; align-items: center; gap: 20px; }
    .header-search input { 
      background: rgba(255, 255, 255, 0.05); border: 1.5px solid rgba(255, 255, 255, 0.08); 
      padding: 12px 24px; border-radius: 14px; width: 320px; font-size: 14px; outline: none;
      color: #fff; transition: all 0.3s;
    }
    .header-search input:focus { border-color: var(--primary); background: rgba(255,255,255,0.1); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2); }
    
    .icon-btn { 
      background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); 
      width: 48px; height: 48px; border-radius: 14px; cursor: pointer; color: #fff;
      display: flex; align-items: center; justify-content: center; font-size: 18px;
      transition: all 0.2s;
    }
    .icon-btn:hover { background: rgba(255, 255, 255, 0.1); transform: translateY(-2px); border-color: rgba(255,255,255,0.3); }

    .content-area { flex: 1; overflow-y: auto; padding: 40px; }

    /* Home Override */
    .is-home .app-sidebar { display: none; }
  `]
})
export class LayoutComponent implements OnInit {
  isHome = false;
  userName = 'Admin';
  currentModuleName = 'Dashboard';

  menuItems = [
    {
      label: 'Business',
      children: [
        { name: 'Quotation & Sales', route: '/sales', icon: '💎' },
        { name: 'Customers', route: '/customers', icon: '🤝' }
      ]
    },
    {
      label: 'Production',
      children: [
        { name: 'Engineering', route: '/design', icon: '⚙️' },
        { name: 'Planning', route: '/planning', icon: '🎯' }
      ]
    },
    {
      label: 'System',
      children: [
        { name: 'Human Resources', route: '/hr', icon: '👤' },
        { name: 'Analytics', route: '/reports', icon: '📈' }
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
    if (user) this.userName = user.fullName;
    this.updateState();
  }

  updateState() {
    const url = this.router.url;
    this.isHome = url === '/dashboard' || url === '/';
    if (url.includes('/sales')) this.currentModuleName = 'Sales & Quotation';
    else if (url.includes('/customers')) this.currentModuleName = 'Customer Relationship';
    else if (url.includes('/design')) this.currentModuleName = 'Engineering & Design';
    else if (url.includes('/planning')) this.currentModuleName = 'Production Planning';
    else if (url.includes('/hr')) this.currentModuleName = 'Talent Management';
    else this.currentModuleName = 'System Overview';
  }

  logout() {
    this.api.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  toggleProfile() {}
}
