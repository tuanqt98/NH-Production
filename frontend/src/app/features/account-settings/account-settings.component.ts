import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../core/services/users.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-container">
      <div class="header">
        <h1>Cài đặt tài khoản</h1>
        <p class="subtitle">Quản lý thông tin cá nhân và bảo mật tài khoản của bạn</p>
      </div>

      <div class="settings-grid">
        <!-- Profile Section -->
        <div class="settings-card">
          <div class="card-header">
            <span class="icon">👤</span>
            <h2>Thông tin cá nhân</h2>
          </div>
          <div class="card-body">
            <div class="avatar-preview-section">
              <div class="avatar-large" (click)="fileInput.click()">
                @if (formData.avatarUrl) {
                  <img [src]="getFullUrl(formData.avatarUrl)" alt="Avatar">
                } @else {
                  <span>{{ getInitials() }}</span>
                }
                <div class="avatar-overlay">
                  <span>📸</span>
                </div>
              </div>
              <div class="avatar-info">
                <label>Ảnh đại diện</label>
                <div class="upload-controls">
                  <input type="file" #fileInput hidden (change)="onFileSelected($event)" accept="image/*">
                  <button class="btn-outline" (click)="fileInput.click()">Chọn ảnh từ máy tính</button>
                  <p class="hint">Dung lượng tối đa 5MB. Hỗ trợ JPG, PNG, WEBP.</p>
                </div>
                <div class="url-input-alt">
                  <input type="text" [(ngModel)]="formData.avatarUrl" placeholder="Hoặc dán link ảnh trực tuyến (https://...)">
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Họ và tên</label>
              <input type="text" [(ngModel)]="formData.fullName" placeholder="Họ và tên">
            </div>

            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="formData.email" placeholder="email@example.com">
            </div>

            <button class="btn-primary" (click)="updateProfile()" [disabled]="loading()">
              {{ loading() ? 'Đang lưu...' : 'Lưu thay đổi' }}
            </button>
          </div>
        </div>

        <!-- Security Section -->
        <div class="settings-card security">
          <div class="card-header">
            <span class="icon">🔒</span>
            <h2>Bảo mật & Mật khẩu</h2>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label>Mật khẩu hiện tại</label>
              <input type="password" [(ngModel)]="passwords.current" placeholder="••••••••">
            </div>
            <div class="form-group">
              <label>Mật khẩu mới</label>
              <input type="password" [(ngModel)]="passwords.new" placeholder="••••••••">
            </div>
            <div class="form-group">
              <label>Xác nhận mật khẩu mới</label>
              <input type="password" [(ngModel)]="passwords.confirm" placeholder="••••••••">
            </div>

            @if (errorMessage) {
              <div class="error-msg">{{ errorMessage }}</div>
            }
            @if (successMessage) {
              <div class="success-msg">{{ successMessage }}</div>
            }

            <button class="btn-primary" (click)="changePassword()" [disabled]="loading() || !passwords.current || !passwords.new">
              {{ loading() ? 'Đang cập nhật...' : 'Đổi mật khẩu' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,

  styles: [`
    .settings-container { padding: 2rem; max-width: 1000px; margin: 0 auto; animation: fadeIn 0.3s ease; }
    .header { margin-bottom: 2rem; }
    .header h1 { font-size: 2rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem; }
    .subtitle { color: #94a3b8; font-size: 1rem; }

    .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
    @media (max-width: 768px) { .settings-grid { grid-template-columns: 1fr; } }

    .settings-card { 
      background: rgba(30, 41, 59, 0.7); 
      border: 1px solid rgba(255,255,255,0.1); 
      border-radius: 1.5rem; 
      padding: 2rem; 
      backdrop-filter: blur(20px);
    }

    .card-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 1rem; }
    .card-header .icon { font-size: 1.5rem; }
    .card-header h2 { font-size: 1.25rem; font-weight: 600; color: #fff; margin: 0; }

    .avatar-preview-section { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; }
    .avatar-large { 
      width: 80px; 
      height: 80px; 
      border-radius: 50%; 
      background: var(--accent-gradient); 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 2rem; 
      font-weight: 700; 
      color: white; 
      overflow: hidden;
      border: 3px solid rgba(255,255,255,0.1);
      position: relative;
      cursor: pointer;
    }
    .avatar-large img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .avatar-large:hover .avatar-overlay { opacity: 1; }
    .avatar-info { flex: 1; display: flex; flex-direction: column; gap: 0.75rem; }

    .upload-controls { display: flex; flex-direction: column; gap: 0.5rem; }
    .btn-outline {
      padding: 0.5rem 1rem;
      background: transparent;
      border: 1px solid #ef4444;
      color: #ef4444;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      width: fit-content;
    }
    .btn-outline:hover { background: rgba(239, 68, 68, 0.1); }
    .url-input-alt input {
      width: 100%;
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      color: #94a3b8;
      font-size: 0.75rem;
      padding: 0.25rem 0;
    }
    .url-input-alt input:focus { border-bottom-color: #ef4444; outline: none; }

    .form-group { margin-bottom: 1.5rem; }
    .form-group label { display: block; font-size: 0.875rem; font-weight: 500; color: #94a3b8; margin-bottom: 0.5rem; }
    .form-group input { 
      width: 100%; 
      padding: 0.75rem 1rem; 
      background: rgba(15, 23, 42, 0.6); 
      border: 1px solid rgba(255,255,255,0.1); 
      border-radius: 0.75rem; 
      color: #fff; 
      transition: all 0.2s;
    }
    .form-group input:focus { outline: none; border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1); }
    .hint { font-size: 0.75rem; color: #64748b; margin-top: 0.4rem; }

    .btn-primary { 
      width: 100%; 
      padding: 0.75rem; 
      background: var(--accent-gradient); 
      color: white; 
      border: none; 
      border-radius: 0.75rem; 
      font-weight: 600; 
      cursor: pointer; 
      transition: opacity 0.2s;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary:not(:disabled):hover { opacity: 0.9; }

    .error-msg { color: #fe8b8b; font-size: 0.875rem; margin-bottom: 1rem; background: rgba(220, 38, 38, 0.1); padding: 0.75rem; border-radius: 0.5rem; }
    .success-msg { color: #86efac; font-size: 0.875rem; margin-bottom: 1rem; background: rgba(34, 197, 94, 0.1); padding: 0.75rem; border-radius: 0.5rem; }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `],
})
export class AccountSettingsComponent implements OnInit {
  private usersService = inject(UsersService);
  private authService = inject(AuthService);

  loading = signal(false);
  formData = {
    fullName: '',
    email: '',
    avatarUrl: ''
  };

  passwords = {
    current: '',
    new: '',
    confirm: ''
  };

  errorMessage = '';
  successMessage = '';

  ngOnInit() {
    const user = this.authService.user();
    if (user) {
      this.formData = {
        fullName: user.fullName || '',
        email: user.email || '',
        avatarUrl: (user as any).avatarUrl || ''
      };
    }
  }

  getInitials(): string {
    return this.formData.fullName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  getFullUrl(url: string): string {
    return this.authService.getFullUrl(url);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.loading.set(true);
    this.errorMessage = '';
    this.successMessage = '';

    this.usersService.uploadAvatar(file).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.formData.avatarUrl = res.data.avatarUrl || '';
          this.authService.updateUser(res.data);
          this.successMessage = 'Tải ảnh đại diện thành công!';
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Có lỗi xảy ra khi tải ảnh';
        this.loading.set(false);
      }
    });
  }

  updateProfile() {
    this.loading.set(true);
    this.errorMessage = '';
    this.successMessage = '';

    this.usersService.updateProfile({
      fullName: this.formData.fullName,
      email: this.formData.email,
      avatarUrl: this.formData.avatarUrl
    }).subscribe({
      next: (res) => {
        this.authService.updateUser(res.data);
        this.successMessage = 'Thông tin cá nhân đã được cập nhật thành công!';
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Có lỗi xảy ra khi cập nhật thông tin';
        this.loading.set(false);
      }
    });
  }

  changePassword() {
    if (this.passwords.new !== this.passwords.confirm) {
      this.errorMessage = 'Mật khẩu mới không khớp!';
      return;
    }

    this.loading.set(true);
    this.errorMessage = '';
    this.successMessage = '';

    this.usersService.updateProfile({
      currentPassword: this.passwords.current,
      newPassword: this.passwords.new
    }).subscribe({
      next: () => {
        this.successMessage = 'Mật khẩu đã được thay đổi thành công!';
        this.passwords = { current: '', new: '', confirm: '' };
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Có lỗi xảy ra khi đổi mật khẩu';
        this.loading.set(false);
      }
    });
  }
}
