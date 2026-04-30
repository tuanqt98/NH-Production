import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [FormsModule],
    template: `
    <div class="login-page">
      <div class="login-bg"></div>
      <div class="login-card animate-slide-up">
        <div class="login-logo">
          <div class="logo-badge">NH</div>
          <h1 class="login-title">Production Management</h1>
          <p class="login-subtitle">Hệ thống quản lý sản xuất</p>
        </div>

        <form (ngSubmit)="onLogin()" class="login-form">
          <div class="form-group">
            <label class="form-label">Tên đăng nhập</label>
            <input
              class="form-input"
              type="text"
              [(ngModel)]="username"
              name="username"
              placeholder="Nhập tên đăng nhập"
              autocomplete="username"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">Mật khẩu</label>
            <input
              class="form-input"
              [type]="showPassword() ? 'text' : 'password'"
              [(ngModel)]="password"
              name="password"
              placeholder="Nhập mật khẩu"
              autocomplete="current-password"
              required
            />
            <button type="button" class="toggle-password" (click)="showPassword.set(!showPassword())">
              {{ showPassword() ? '🙈' : '👁️' }}
            </button>
          </div>

          @if (errorMsg()) {
            <div class="login-error">{{ errorMsg() }}</div>
          }

          <button type="submit" class="btn btn-primary btn-lg login-btn" [disabled]="loading()">
            @if (loading()) {
              <span class="loading-spinner" style="width:20px;height:20px"></span>
              Đang đăng nhập...
            } @else {
              Đăng nhập
            }
          </button>
        </form>

        <div class="login-footer">
          <span>NH Printing © 2026</span>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .login-bg {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 30% 20%, rgba(229,9,20,0.15) 0%, transparent 50%),
                  radial-gradient(ellipse at 70% 80%, rgba(184,29,36,0.1) 0%, transparent 50%),
                  var(--bg-primary);
      z-index: 0;
    }

    .login-card {
      position: relative;
      z-index: 1;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: 48px;
      width: 100%;
      max-width: 440px;
      box-shadow: var(--shadow-lg);
    }

    .login-logo {
      text-align: center;
      margin-bottom: 36px;
    }

    .logo-badge {
      width: 64px;
      height: 64px;
      background: var(--accent-gradient);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.5rem;
      color: white;
      margin: 0 auto 16px;
      box-shadow: var(--shadow-glow);
    }

    .login-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-bright);
      margin-bottom: 4px;
    }

    .login-subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-group {
      position: relative;
    }

    .toggle-password {
      position: absolute;
      right: 12px;
      bottom: 10px;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.1rem;
    }

    .login-error {
      padding: 10px 14px;
      background: rgba(229,9,20,0.1);
      border: 1px solid rgba(229,9,20,0.3);
      border-radius: var(--radius-sm);
      color: var(--status-error);
      font-size: 0.85rem;
      text-align: center;
    }

    .login-btn {
      width: 100%;
      justify-content: center;
      margin-top: 8px;
    }

    .login-footer {
      text-align: center;
      margin-top: 24px;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
  `],
})
export class LoginComponent {
    username = '';
    password = '';
    loading = signal(false);
    errorMsg = signal('');
    showPassword = signal(false);

    constructor(
        private auth: AuthService,
        private router: Router,
        private toast: ToastService
    ) {
        // Redirect if already logged in
        if (this.auth.isLoggedIn()) {
            this.router.navigate(['/dashboard']);
        }
    }

    onLogin(): void {
        if (!this.username || !this.password) {
            this.errorMsg.set('Vui lòng nhập đầy đủ thông tin');
            return;
        }

        this.loading.set(true);
        this.errorMsg.set('');

        this.auth.login(this.username, this.password).subscribe({
            next: () => {
                this.toast.success('Đăng nhập thành công!');
                this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                this.loading.set(false);
                this.errorMsg.set(err.error?.message || 'Tên đăng nhập hoặc mật khẩu không đúng');
            },
        });
    }
}
