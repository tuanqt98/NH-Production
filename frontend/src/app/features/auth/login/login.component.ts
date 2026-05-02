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
      <div class="mesh-bg"></div>
      
      <div class="glass-login-card">
        <div class="login-header">
          <div class="premium-logo">
            <div class="logo-inner">NH</div>
          </div>
          <h1 class="premium-title">Production Management</h1>
          <p class="premium-subtitle">Hệ thống quản lý sản xuất tinh gọn</p>
        </div>

        <form (ngSubmit)="onLogin()" class="premium-form">
          <div class="premium-input-group" [class.focused]="isUserFocused">
            <label>Tên đăng nhập</label>
            <div class="input-wrapper">
              <span class="input-icon">👤</span>
              <input type="text" [(ngModel)]="username" name="username" placeholder="Nhập ID nhân viên" 
                     (focus)="isUserFocused = true" (blur)="isUserFocused = false" required>
            </div>
          </div>

          <div class="premium-input-group" [class.focused]="isPassFocused">
            <label>Mật khẩu</label>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input [type]="showPassword() ? 'text' : 'password'" [(ngModel)]="password" name="password" 
                     placeholder="••••••••" (focus)="isPassFocused = true" (blur)="isPassFocused = false" required>
              <button type="button" class="eye-toggle" (click)="showPassword.set(!showPassword())">
                {{ showPassword() ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <div class="error-msg-wrapper" *ngIf="errorMsg()">
            <div class="error-bubble">{{ errorMsg() }}</div>
          </div>

          <button type="submit" class="btn-login-hero" [disabled]="loading()">
            <span *ngIf="!loading()">Đăng nhập ngay</span>
            <div class="loader-dots" *ngIf="loading()">
              <span></span><span></span><span></span>
            </div>
          </button>
        </form>

        <div class="premium-footer">
          <div class="footer-line"></div>
          <p>NH Production & Printing © 2026</p>
          <div class="footer-links">
            <a href="#">Support</a>
            <span class="dot"></span>
            <a href="#">Security</a>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .login-page { 
      height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center;
      background: var(--bg-main); position: relative; overflow: hidden; font-family: 'Inter', sans-serif;
    }
    
    .mesh-bg {
      position: absolute; width: 100%; height: 100%;
      background-image: var(--mesh-gradient);
      filter: blur(140px); opacity: 0.7; animation: meshFlow 25s infinite alternate;
      transform: scale(1.2);
    }
    @keyframes meshFlow {
      0% { transform: scale(1.2) translate(0, 0); }
      50% { transform: scale(1.4) translate(8%, 8%); }
      100% { transform: scale(1.3) translate(-8%, -8%); }
    }

    .glass-login-card {
      width: 480px; padding: 64px; background: rgba(255, 255, 255, 0.04); 
      backdrop-filter: blur(40px) saturate(200%); -webkit-backdrop-filter: blur(40px);
      border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 40px;
      box-shadow: 0 40px 100px rgba(0, 0, 0, 0.6); position: relative; z-index: 10;
      animation: cardEnter 1s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes cardEnter {
      from { opacity: 0; transform: scale(0.9) translateY(40px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .login-header { text-align: center; margin-bottom: 48px; }
    .premium-logo { 
      width: 72px; height: 72px; margin: 0 auto 24px;
      background: linear-gradient(135deg, var(--primary), #818cf8);
      border-radius: 20px; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 12px 24px rgba(99, 102, 241, 0.5);
      transform: rotate(-5deg);
    }
    .logo-inner { color: #fff; font-weight: 900; font-size: 24px; font-family: 'Outfit'; }
    .premium-title { font-family: 'Outfit'; font-size: 28px; font-weight: 800; color: #fff; margin-bottom: 8px; letter-spacing: -0.5px; }
    .premium-subtitle { font-size: 15px; color: var(--text-muted); font-weight: 500; }

    .premium-form { display: flex; flex-direction: column; gap: 28px; }
    .premium-input-group { display: flex; flex-direction: column; gap: 10px; transition: all 0.3s; }
    .premium-input-group label { font-size: 13px; font-weight: 800; color: var(--primary); padding-left: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .input-wrapper { 
      position: relative; display: flex; align-items: center; 
      background: rgba(255, 255, 255, 0.05); border: 1.5px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px; transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .input-icon { position: absolute; left: 18px; font-size: 20px; opacity: 0.8; }
    .input-wrapper input { 
      width: 100%; border: none; background: transparent; padding: 16px 20px 16px 54px;
      font-size: 16px; outline: none; color: #fff; font-weight: 500;
    }
    .input-wrapper input::placeholder { color: rgba(255,255,255,0.3); }
    .premium-input-group.focused .input-wrapper { border-color: var(--primary); background: rgba(255, 255, 255, 0.08); box-shadow: 0 0 0 5px rgba(99, 102, 241, 0.15); }

    .eye-toggle { position: absolute; right: 16px; border: none; background: transparent; cursor: pointer; font-size: 20px; color: #fff; opacity: 0.6; }
    .eye-toggle:hover { opacity: 1; }

    .btn-login-hero {
      margin-top: 16px; height: 60px; background: var(--primary); color: #fff; border: none;
      border-radius: 20px; font-size: 17px; font-weight: 800; cursor: pointer;
      transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); box-shadow: 0 15px 30px rgba(99, 102, 241, 0.4);
    }
    .btn-login-hero:hover { background: var(--primary-hover); transform: translateY(-3px) scale(1.02); box-shadow: 0 20px 40px rgba(99, 102, 241, 0.5); }
    .btn-login-hero:active { transform: translateY(0) scale(1); }

    .loader-dots { display: flex; gap: 8px; justify-content: center; }
    .loader-dots span { width: 10px; height: 10px; background: #fff; border-radius: 50%; animation: dotWave 1.2s infinite; }
    .loader-dots span:nth-child(2) { animation-delay: 0.2s; }
    .loader-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes dotWave { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

    .error-bubble { 
      background: #fef2f2; border: 1px solid #fee2e2; color: #ef4444; 
      padding: 12px; border-radius: 12px; font-size: 13px; font-weight: 600; text-align: center;
      animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
    }
    @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }

    .premium-footer { margin-top: 40px; text-align: center; }
    .footer-line { height: 1px; background: var(--border-light); margin-bottom: 24px; }
    .premium-footer p { font-size: 12px; color: #94a3b8; margin-bottom: 12px; }
    .footer-links { display: flex; align-items: center; justify-content: center; gap: 12px; }
    .footer-links a { font-size: 12px; color: var(--primary); text-decoration: none; font-weight: 600; }
    .dot { width: 4px; height: 4px; background: #cbd5e1; border-radius: 50%; }
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
