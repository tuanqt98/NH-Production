import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService, User, Role } from '../../../core/services/users.service';
import { HrService, Department } from '../../../core/services/hr.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="users-container">
      <div class="header">
        <h1>Quản lý người dùng</h1>
        <div class="header-actions">
          <input type="file" #fileInput (change)="onFileSelected($event)" accept=".xlsx, .xls" style="display: none">
          <button class="btn-secondary" (click)="fileInput.click()">
            <span class="import-icon">📥</span> Import Excel
          </button>
          <button class="btn-primary" (click)="openModal()">
            <span class="plus-icon">+</span> Thêm người dùng
          </button>
          <button class="btn-danger" *ngIf="selectedIds().size > 0" (click)="bulkDelete()">
            <span class="trash-icon">🗑️</span> Xoá đã chọn ({{ selectedIds().size }})
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Tổng người dùng</span>
          <span class="stat-value">{{ users().length }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Đang hoạt động</span>
          <span class="stat-value">{{ activeCount() }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Admin</span>
          <span class="stat-value">{{ adminCount() }}</span>
        </div>
      </div>

      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px">
                <input type="checkbox" (change)="toggleAll($event)" [checked]="isAllSelected()">
              </th>
              <th>Họ tên</th>
              <th>Username</th>
              <th>Email</th>
              <th>Bộ phận</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users()">
              <td>
                <input type="checkbox" [checked]="selectedIds().has(user.id)" (change)="toggleSelection(user.id)">
              </td>
              <td>
                <div class="user-info">
                  <div class="avatar">{{ user.fullName.charAt(0) }}</div>
                  <span>{{ user.fullName }}</span>
                </div>
              </td>
              <td><code>{{ user.username }}</code></td>
              <td>{{ user.email }}</td>
              <td>{{ user.department?.name || '-' }}</td>
              <td>
                <span class="role-badge" [class]="user.role.name">
                  {{ user.role.name | titlecase }}
                </span>
              </td>
              <td>
                <span class="status-indicator" [class.active]="user.isActive">
                  {{ user.isActive ? 'Hoạt động' : 'Tạm khóa' }}
                </span>
              </td>
              <td>{{ user.createdAt | date:'dd/MM/yyyy' }}</td>
              <td>
                <div class="actions">
                  <button class="btn-icon" title="Sửa" (click)="openModal(user); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  </button>
                  <button class="btn-icon" title="Reset mật khẩu" (click)="resetPassword(user); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm-7.3 4.7L3.24 7.24A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8z"/></svg>
                  </button>
                  <button class="btn-icon" [title]="user.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'" (click)="toggleStatus(user); $event.stopPropagation()">
                    <svg *ngIf="user.isActive" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg>
                    <svg *ngIf="!user.isActive" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>
                  </button>
                  <button class="btn-icon delete" title="Xóa người dùng" (click)="deleteUser(user); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- User Modal -->
      <div class="modal-overlay" *ngIf="showModal()">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ isEdit() ? 'Cập nhật người dùng' : 'Thêm người dùng mới' }}</h2>
            <button class="close-btn" (click)="closeModal()">&times;</button>
          </div>
          <form (submit)="saveUser($event)">
            <div class="form-grid">
              <div class="form-group">
                <label>Họ và tên</label>
                <input type="text" name="fullName" [(ngModel)]="formData.fullName" required placeholder="Nhập họ tên đầy đủ">
              </div>
              <div class="form-group">
                <label>Username</label>
                <input type="text" name="username" [(ngModel)]="formData.username" required [disabled]="isEdit()" placeholder="Tên đăng nhập">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" [(ngModel)]="formData.email" required placeholder="example@domain.com">
              </div>
              <div class="form-group">
                <label>Vai trò</label>
                <select name="roleId" [(ngModel)]="formData.roleId" required>
                  <option *ngFor="let role of roles()" [ngValue]="role.id">
                    {{ role.name }} - {{ role.description }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Bộ phận</label>
                <select name="departmentId" [(ngModel)]="formData.departmentId">
                  <option [ngValue]="undefined">-- Không chọn --</option>
                  <option *ngFor="let dept of depts()" [ngValue]="dept.id">
                    {{ dept.name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Mật khẩu {{ isEdit() ? '(Để trống nếu không đổi)' : '' }}</label>
                <input type="password" name="password" [(ngModel)]="formData.password" [required]="!isEdit()" placeholder="••••••••">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeModal()">Hủy</button>
              <button type="submit" class="btn-primary" [disabled]="loading()">
                {{ loading() ? 'Đang lưu...' : (isEdit() ? 'Cập nhật' : 'Tạo mới') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Confirm Modal -->
      <div class="modal-overlay confirm-overlay" *ngIf="showConfirm()">
        <div class="modal confirm-modal">
          <div class="modal-body centered">
            <div class="warning-icon">⚠️</div>
            <h3>Xác nhận thay đổi</h3>
            <p>{{ confirmMessage() }}</p>
          </div>
          <div class="modal-footer centered">
            <button class="btn-secondary" (click)="closeConfirm()">Hủy</button>
            <button class="btn-primary" (click)="executeConfirm()">Đồng ý</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .users-container { padding: 2rem; max-width: 1200px; margin: 0 auto; animation: fadeIn 0.3s ease; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    .header h1 { font-size: 1.875rem; font-weight: 700; color: #fff; margin: 0; }
    .header-actions { display: flex; gap: 1rem; align-items: center; }
    
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .stat-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; padding: 1.5rem; backdrop-filter: blur(10px); }
    .stat-label { display: block; font-size: 0.875rem; color: #94a3b8; margin-bottom: 0.5rem; }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: #ef4444; }

    .table-card { background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { padding: 1rem 1.5rem; background: rgba(255,255,255,0.03); font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .data-table td { padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); color: #e2e8f0; vertical-align: middle; }
    .data-table tr:hover { background: rgba(255,255,255,0.02); }

    .user-info { display: flex; align-items: center; gap: 0.75rem; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: #ef4444; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #fff; }
    
    .role-badge { padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
    .role-badge.admin { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
    .role-badge.manager { background: rgba(59,130,246,0.1); color: #3b82f6; border: 1px solid rgba(59,130,246,0.2); }
    .role-badge.worker { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }

    .status-indicator { display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.875rem; color: #94a3b8; }
    .status-indicator::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #64748b; }
    .status-indicator.active { color: #10b981; }
    .status-indicator.active::before { background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.4); }

    .actions { display: flex; gap: 0.5rem; }
    .btn-icon { background: none; border: none; padding: 0.5rem; color: #94a3b8; cursor: pointer; border-radius: 0.375rem; transition: all 0.2s; }
    .btn-icon:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .btn-icon.delete:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

    /* Modal Styles */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .modal { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; width: 100%; max-width: 600px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .modal-header { padding: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
    .modal-header h2 { margin: 0; font-size: 1.25rem; color: #fff; }
    .close-btn { background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; }
    
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; padding: 1.5rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-group label { font-size: 0.875rem; color: #94a3b8; }
    .form-group input, .form-group select { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; padding: 0.625rem; color: #fff; }
    .form-group input:focus { border-color: #ef4444; outline: none; }
    
    .modal-footer { padding: 1.5rem; display: flex; justify-content: flex-end; gap: 1rem; border-top: 1px solid rgba(255,255,255,0.05); }
    
    /* Confirm Modal Specific */
    .confirm-overlay { z-index: 1100; }
    .confirm-modal { max-width: 400px; text-align: center; }
    .centered { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; }
    .warning-icon { font-size: 3rem; margin-bottom: 1rem; }
    .confirm-modal h3 { margin-bottom: 0.5rem; font-size: 1.25rem; color: #fff; }
    .confirm-modal p { color: #94a3b8; font-size: 0.875rem; margin-bottom: 0px; }
    .modal-footer.centered { border: none; padding-top: 0; }

    .btn-primary { background: #ef4444; color: white; border: none; padding: 0.625rem 1.25rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 0.5rem; }
    .btn-primary:hover { background: #dc2626; transform: translateY(-1px); }
    .btn-secondary { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 0.625rem 1.25rem; border-radius: 0.5rem; cursor: pointer; }
    .btn-danger { background: #991b1b; color: white; border: none; padding: 0.625rem 1.25rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 0.5rem; }
    .btn-danger:hover { background: #b91c1c; transform: translateY(-1px); }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class UsersComponent implements OnInit {
  private usersService = inject(UsersService);
  private hrService = inject(HrService);

  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  depts = signal<Department[]>([]);
  loading = signal(false);
  showModal = signal(false);
  isEdit = signal(false);

  formData = {
    id: 0,
    username: '',
    email: '',
    fullName: '',
    password: '',
    roleId: 3,
    departmentId: undefined as number | undefined,
  };

  activeCount = signal(0);
  adminCount = signal(0);
  selectedIds = signal<Set<number>>(new Set());

  // Confirm Modal State
  showConfirm = signal(false);
  confirmMessage = signal('');
  confirmCallback: (() => void) | null = null;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.usersService.getUsers().subscribe(res => {
      this.users.set(res.data || []);
      this.calculateStats();
      this.selectedIds.set(new Set());
    });
    this.usersService.getRoles().subscribe(res => this.roles.set(res.data || []));
    this.hrService.getDepartments().subscribe(res => this.depts.set(res.data || []));
  }

  calculateStats() {
    this.activeCount.set(this.users().filter(u => u.isActive).length);
    this.adminCount.set(this.users().filter(u => u.role.name === 'admin').length);
  }

  openModal(user?: User) {
    if (user) {
      this.isEdit.set(true);
      this.formData = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        password: '',
        roleId: user.roleId,
        departmentId: user.departmentId,
      };
    } else {
      this.isEdit.set(false);
      this.formData = { id: 0, username: '', email: '', fullName: '', password: '', roleId: 3, departmentId: undefined };
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveUser(event: Event) {
    event.preventDefault();
    this.loading.set(true);

    if (this.isEdit()) {
      const { id, ...data } = this.formData;
      if (!data.password) delete (data as any).password;

      this.usersService.updateUser(id, data).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    } else {
      const { id, ...data } = this.formData;
      this.usersService.createUser(data).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    }
  }

  resetPassword(user: User) {
    this.confirmMessage.set(`Đặt lại mật khẩu cho người dùng "${user.fullName}" về mặc định ("1")?`);
    this.confirmCallback = () => {
      this.usersService.resetPassword(user.id).subscribe(() => {
        this.closeConfirm();
        alert('Mật khẩu đã được đặt lại về "1"');
      });
    };
    this.showConfirm.set(true);
  }

  toggleStatus(user: User) {
    this.confirmMessage.set(`Bạn có chắc muốn ${user.isActive ? 'khóa' : 'mở khóa'} người dùng "${user.fullName}"?`);
    this.confirmCallback = () => {
      this.usersService.updateUser(user.id, { isActive: !user.isActive }).subscribe(() => {
        this.loadData();
        this.closeConfirm();
      });
    };
    this.showConfirm.set(true);
  }

  deleteUser(user: User) {
    this.confirmMessage.set(`Xác nhận XOÁ người dùng "${user.fullName}"? Lưu ý: Nếu người dùng đã có dữ liệu sản xuất/chấm công, hệ thống sẽ chuyển sang trạng thái "Nghỉ việc" thay vì xoá hẳn để bảo mật dữ liệu.`);
    this.confirmCallback = () => {
      this.usersService.deleteUser(user.id).subscribe({
        next: () => {
          this.loadData();
          this.closeConfirm();
        },
        error: (err) => {
          this.closeConfirm();
          alert('Lỗi: ' + (err.error?.message || err.message));
        }
      });
    };
    this.showConfirm.set(true);
  }
  
  toggleSelection(id: number) {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  toggleAll(event: any) {
    if (event.target.checked) {
      this.selectedIds.set(new Set(this.users().map(u => u.id)));
    } else {
      this.selectedIds.set(new Set());
    }
  }

  isAllSelected() {
    return this.users().length > 0 && this.selectedIds().size === this.users().length;
  }

  bulkDelete() {
    const count = this.selectedIds().size;
    this.confirmMessage.set(`Xác nhận XOÁ ${count} người dùng đã chọn? Hệ thống sẽ tự động chuyển sang trạng thái "Nghỉ việc" đối với các nhân sự đã có dữ liệu.`);
    this.confirmCallback = () => {
      this.loading.set(true);
      this.usersService.bulkDeleteUsers(Array.from(this.selectedIds())).subscribe({
        next: () => {
          this.loadData();
          this.closeConfirm();
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.closeConfirm();
          alert('Lỗi: ' + (err.error?.message || err.message));
        }
      });
    };
    this.showConfirm.set(true);
  }

  closeConfirm() {
    this.showConfirm.set(false);
    this.confirmCallback = null;
  }

  executeConfirm() {
    if (this.confirmCallback) {
      this.confirmCallback();
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.loading.set(true);
      this.usersService.importUsers(file).subscribe({
        next: (res: any) => {
          this.loading.set(false);
          let msg = `Import thành công! \nThành công: ${res.data.success}\nThất bại: ${res.data.failed}\nMật khẩu mặc định: "1"`;
          if (res.data.errors && res.data.errors.length > 0) {
            msg += `\n\nLỗi đầu tiên: ${res.data.errors[0]}`;
          }
          alert(msg);
          this.loadData();
          event.target.value = '';
        },
        error: (err: any) => {
          this.loading.set(false);
          alert('Lỗi khi import file: ' + (err.error?.message || err.message));
          event.target.value = '';
        }
      });
    }
  }
}
