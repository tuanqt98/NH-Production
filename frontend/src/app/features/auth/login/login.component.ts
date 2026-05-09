import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [FormsModule, CommonModule],
    template: `
    <div class="login-page">
      <!-- Odoo-style top bar -->
      <div class="odoo-topbar">
        <div class="topbar-brand">
          <div class="brand-logo">NH</div>
          <span class="brand-text">NH Production</span>
        </div>
      </div>

      <!-- Main login area -->
      <div class="login-body">
        <div class="login-card">
          <div class="login-card-header">
            <h1>Đăng nhập</h1>
            <p>Hệ thống quản lý sản xuất NH Production & Printing</p>
          </div>

          <form (ngSubmit)="onLogin()" class="login-form">
            <div class="form-group">
              <label for="login-username">Tên đăng nhập</label>
              <input id="login-username"
                     type="text" 
                     class="form-input"
                     [(ngModel)]="username" 
                     name="username" 
                     placeholder="Nhập ID nhân viên"
                     required
                     autocomplete="username">
            </div>

            <div class="form-group">
              <label for="login-password">Mật khẩu</label>
              <div class="password-wrapper">
                <input id="login-password"
                       [type]="showPassword() ? 'text' : 'password'" 
                       class="form-input"
                       [(ngModel)]="password" 
                       name="password" 
                       placeholder="Nhập mật khẩu"
                       required
                       autocomplete="current-password">
                <button type="button" class="toggle-pw" (click)="showPassword.set(!showPassword())">
                  {{ showPassword() ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>

            <div class="error-box" *ngIf="errorMsg()">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 4h2v5H7V4zm0 6h2v2H7v-2z"/>
              </svg>
              <span>{{ errorMsg() }}</span>
            </div>

            <button type="submit" class="btn-submit" [disabled]="loading()">
              <span *ngIf="!loading()">Đăng nhập</span>
              <div class="spinner" *ngIf="loading()"></div>
            </button>
          </form>

          <div class="login-footer">
            <span>NH Production & Printing © 2026</span>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    /* ─── Page ──────────────────────────────────────── */
    .login-page { 
      height: 100vh; 
      width: 100vw; 
      display: flex; 
      flex-direction: column;
      background: #EDEDED;
      font-family: 'Inter', sans-serif;
    }

    /* ─── Odoo Top Bar ─────────────────────────────── */
    .odoo-topbar {
      height: 46px;
      background: var(--odoo-purple, #714B67);
      display: flex;
      align-items: center;
      padding: 0 16px;
      flex-shrink: 0;
    }

    .topbar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-logo {
      width: 30px;
      height: 30px;
      background: rgba(255,255,255,0.2);
      color: #fff;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 12px;
      font-family: 'Outfit', sans-serif;
    }

    .brand-text {
      color: #fff;
      font-weight: 600;
      font-size: 15px;
      font-family: 'Outfit', sans-serif;
      letter-spacing: -0.3px;
    }

    /* ─── Login Body ───────────────────────────────── */
    .login-body {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: 
        linear-gradient(135deg, rgba(113,75,103,0.06) 0%, rgba(113,75,103,0.02) 50%, rgba(200,200,220,0.08) 100%);
    }

    /* ─── Login Card ───────────────────────────────── */
    .login-card {
      width: 420px;
      background: #FFFFFF;
      border-radius: 8px;
      border: 1px solid #DEE2E6;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
      padding: 40px;
      animation: fadeUp 0.4s ease;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .login-card-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .login-card-header h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: #212529;
      margin-bottom: 8px;
    }

    .login-card-header p {
      font-size: 13px;
      color: #6C757D;
      line-height: 1.5;
    }

    /* ─── Form ─────────────────────────────────────── */
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 13px;
      font-weight: 600;
      color: #495057;
    }

    .form-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #CED4DA;
      border-radius: 4px;
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      color: #212529;
      background: #FFFFFF;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .form-input:focus {
      border-color: var(--odoo-purple, #714B67);
      box-shadow: 0 0 0 3px rgba(113, 75, 103, 0.12);
    }

    .form-input::placeholder {
      color: #ADB5BD;
    }

    .password-wrapper {
      position: relative;
    }

    .password-wrapper .form-input {
      padding-right: 44px;
    }

    .toggle-pw {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 16px;
      padding: 4px;
      line-height: 1;
      opacity: 0.5;
      transition: opacity 0.15s;
    }
    .toggle-pw:hover { opacity: 1; }

    /* ─── Error ────────────────────────────────────── */
    .error-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #F8D7DA;
      border: 1px solid #F5C6CB;
      color: #721C24;
      padding: 10px 14px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      animation: shake 0.3s ease;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    /* ─── Submit Button ────────────────────────────── */
    .btn-submit {
      width: 100%;
      height: 44px;
      background: var(--odoo-purple, #714B67);
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 15px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: background 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 4px;
    }
    .btn-submit:hover { background: var(--odoo-purple-dark, #5B3D54); }
    .btn-submit:active { transform: scale(0.99); }
    .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

    /* ─── Spinner ──────────────────────────────────── */
    .spinner {
      width: 20px;
      height: 20px;
      border: 2.5px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ─── Footer ───────────────────────────────────── */
    .login-footer {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid #E9ECEF;
      text-align: center;
    }

    .login-footer span {
      font-size: 12px;
      color: #ADB5BD;
    }

    /* ─── Responsive ───────────────────────────────── */
    @media (max-width: 480px) {
      .login-card {
        width: calc(100% - 32px);
        padding: 28px 24px;
        margin: 16px;
      }
    }
  `],
})
export class LoginComponent {
    username = '';
    password = '';
    loading = signal(false);
    errorMsg = signal('');
    showPassword = signal(false);

    isUserFocused = false;
    isPassFocused = false;

    constructor(
        private auth: AuthService,
        private router: Router,
        private toast: ToastService
    ) {
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
