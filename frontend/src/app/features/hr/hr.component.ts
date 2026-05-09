import { Component, OnInit, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService, Department, Shift, Employee, AttendanceSummary } from '../../core/services/hr.service';
import { AuthService } from '../../core/services/auth.service';

const AVATAR_COLORS = [
  '#E74C3C','#8E44AD','#2980B9','#27AE60','#F39C12','#D35400',
  '#1ABC9C','#C0392B','#7D3C98','#2E86C1','#148F77','#CA6F1E',
  '#6C3483','#1F618D','#117A65','#B7950B','#A93226','#2471A3',
];

@Component({
    selector: 'app-hr',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="hr-module">
      <!-- Department Sidebar -->
      <div class="dept-sidebar" *ngIf="viewMode !== 'detail' && (isAdmin() || isManager())">
        <div class="dept-sidebar-title">PHÒNG/BAN</div>
        <div class="dept-item" [class.active]="!empDeptFilter"
             (click)="empDeptFilter = undefined; loadEmployees()">
          <span>Tất cả</span>
          <span class="dept-count">{{allEmployees().length}}</span>
        </div>
        <div class="dept-item" *ngFor="let d of departments()"
             [class.active]="empDeptFilter === d.id"
             (click)="empDeptFilter = d.id; loadEmployees()">
          <span>{{d.name}}</span>
          <span class="dept-count">{{getDeptCount(d.id)}}</span>
        </div>
      </div>

      <!-- Main Content -->
      <div class="hr-main">
        <!-- Toolbar (Kanban/List views) -->
        <div class="hr-toolbar" *ngIf="viewMode !== 'detail'">
          <div class="toolbar-left">
            <input class="search-input" type="text" placeholder="🔍 Tìm kiếm..."
                   [(ngModel)]="empSearch" (ngModelChange)="loadEmployees()">
          </div>
          <div class="toolbar-right">
            <span class="toolbar-info">{{employees().length}} nhân viên</span>
            <div class="view-toggle">
              <button class="view-btn" [class.active]="viewMode === 'kanban'"
                      (click)="viewMode = 'kanban'" title="Kanban">▦</button>
              <button class="view-btn" [class.active]="viewMode === 'list'"
                      (click)="viewMode = 'list'" title="Danh sách">☰</button>
            </div>
            <button class="btn-odoo-sm" (click)="openCreateModal()" *ngIf="isAdmin()">+ Mới</button>
          </div>
        </div>

        <!-- KANBAN VIEW -->
        <div class="kanban-area" *ngIf="viewMode === 'kanban'">
          <div class="kanban-grid">
            <div class="emp-card" *ngFor="let e of employees()" (click)="openDetail(e)">
              <div class="emp-avatar" [style.background]="getAvatarColor(e.fullName)">
                {{getInitial(e.fullName)}}
              </div>
              <div class="emp-card-info">
                <div class="emp-card-name">{{e.fullName}}</div>
                <div class="emp-card-pos">{{e.position || 'Nhân viên'}}</div>
                <div class="emp-card-detail" *ngIf="e.email">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  {{e.email}}
                </div>
                <div class="emp-card-detail" *ngIf="e.phone">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.09 5.18 2 2 0 0 1 5.11 3h3a2 2 0 0 1 2 1.72c.13.81.36 1.61.68 2.36a2 2 0 0 1-.45 2.11L8.09 11.44a16 16 0 0 0 6.47 6.47l2.25-2.25a2 2 0 0 1 2.11-.45c.75.32 1.55.55 2.36.68A2 2 0 0 1 22 16.92z"/></svg>
                  {{e.phone}}
                </div>
                <div class="emp-card-badges">
                  <span class="emp-badge" [class.active]="e.isActive" [class.inactive]="!e.isActive">
                    {{e.isActive ? 'Hoạt động' : 'Nghỉ việc'}}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="empty-state" *ngIf="employees().length === 0">Không tìm thấy nhân viên</div>
        </div>

        <!-- LIST VIEW -->
        <div class="table-area" *ngIf="viewMode === 'list'">
          <table class="odoo-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Bộ phận</th>
                <th>Chức vụ</th>
                <th>Email</th>
                <th>SĐT</th>
                <th>Ngày vào</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let e of employees()" (click)="openDetail(e)">
                <td class="td-name">{{e.fullName}}</td>
                <td>{{e.department?.name || '-'}}</td>
                <td>{{e.position || '-'}}</td>
                <td class="td-muted">{{e.email || '-'}}</td>
                <td>{{e.phone || '-'}}</td>
                <td class="td-muted">{{e.joinDate ? (e.joinDate | date:'dd/MM/yyyy') : '-'}}</td>
                <td>
                  <span class="td-badge" [class.green]="e.isActive" [class.red]="!e.isActive">
                    {{e.isActive ? 'Hoạt động' : 'Nghỉ'}}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="empty-state" *ngIf="employees().length === 0">Không tìm thấy nhân viên</div>
        </div>

        <!-- DETAIL VIEW -->
        <div class="detail-view" *ngIf="viewMode === 'detail' && selectedEmployee">
          <div class="detail-container">
            <div class="detail-header">
              <button class="back-btn" (click)="viewMode = 'kanban'; selectedEmployee = null">← Quay lại</button>
              <span class="detail-nav">/ Nhân viên / {{selectedEmployee.fullName}}</span>
            </div>

            <div class="detail-card">
              <div class="detail-top">
                <div class="detail-avatar" [style.background]="getAvatarColor(selectedEmployee.fullName)">
                  {{getInitial(selectedEmployee.fullName)}}
                </div>
                <div class="detail-title">
                  <h2>{{selectedEmployee.fullName}}</h2>
                  <div class="subtitle">{{selectedEmployee.position || 'Nhân viên'}}</div>
                </div>
              </div>

              <div class="detail-form-grid">
                <div class="form-field">
                  <label>Email công việc</label>
                  <input type="text" [(ngModel)]="detailForm.email" *ngIf="isEditing" />
                  <div class="value" *ngIf="!isEditing">{{selectedEmployee.email || '-'}}</div>
                </div>
                <div class="form-field">
                  <label>Phòng/Ban</label>
                  <select [(ngModel)]="detailForm.departmentId" *ngIf="isEditing">
                    <option [ngValue]="null">-- Chọn --</option>
                    <option *ngFor="let d of departments()" [ngValue]="d.id">{{d.name}}</option>
                  </select>
                  <div class="value" *ngIf="!isEditing">{{selectedEmployee.department?.name || '-'}}</div>
                </div>
                <div class="form-field">
                  <label>Số điện thoại</label>
                  <input type="text" [(ngModel)]="detailForm.phone" *ngIf="isEditing" />
                  <div class="value" *ngIf="!isEditing">{{selectedEmployee.phone || '-'}}</div>
                </div>
                <div class="form-field">
                  <label>Chức vụ</label>
                  <input type="text" [(ngModel)]="detailForm.position" *ngIf="isEditing" />
                  <div class="value" *ngIf="!isEditing">{{selectedEmployee.position || '-'}}</div>
                </div>
                <div class="form-field">
                  <label>Ngày vào làm</label>
                  <input type="date" [(ngModel)]="detailForm.joinDate" *ngIf="isEditing" />
                  <div class="value" *ngIf="!isEditing">{{selectedEmployee.joinDate ? (selectedEmployee.joinDate | date:'dd/MM/yyyy') : '-'}}</div>
                </div>
                <div class="form-field">
                  <label>Mã máy chấm công</label>
                  <input type="text" [(ngModel)]="detailForm.enrollNumber" *ngIf="isEditing" />
                  <div class="value" *ngIf="!isEditing">{{selectedEmployee.enrollNumber || '-'}}</div>
                </div>
              </div>

              <!-- Detail Tabs -->
              <div class="detail-tabs">
                <button class="detail-tab" [class.active]="detailTab === 'work'" (click)="detailTab = 'work'">Thông tin công việc</button>
                <button class="detail-tab" [class.active]="detailTab === 'personal'" (click)="detailTab = 'personal'">Thông tin cá nhân</button>
                <button class="detail-tab" [class.active]="detailTab === 'attendance'" (click)="detailTab = 'attendance'">Chấm công</button>
              </div>

              <div class="tab-panel" *ngIf="detailTab === 'work'">
                <div class="info-grid">
                  <div class="form-field">
                    <label>Tên đăng nhập</label>
                    <div class="value">{{selectedEmployee.username}}</div>
                  </div>
                  <div class="form-field">
                    <label>Vai trò</label>
                    <div class="value">{{selectedEmployee.role?.name || '-'}}</div>
                  </div>
                  <div class="form-field">
                    <label>Trạng thái</label>
                    <div class="value">
                      <span class="td-badge" [class.green]="selectedEmployee.isActive" [class.red]="!selectedEmployee.isActive">
                        {{selectedEmployee.isActive ? 'Hoạt động' : 'Nghỉ việc'}}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="tab-panel" *ngIf="detailTab === 'personal'">
                <div class="info-grid">
                  <div class="form-field">
                    <label>Họ tên đầy đủ</label>
                    <div class="value">{{selectedEmployee.fullName}}</div>
                  </div>
                  <div class="form-field">
                    <label>Email</label>
                    <div class="value">{{selectedEmployee.email || '-'}}</div>
                  </div>
                  <div class="form-field">
                    <label>Số điện thoại</label>
                    <div class="value">{{selectedEmployee.phone || '-'}}</div>
                  </div>
                </div>
              </div>

              <div class="tab-panel" *ngIf="detailTab === 'attendance'">
                <p style="color:#6C757D; font-size:13px;">Xem dữ liệu chấm công tại module Chấm công.</p>
              </div>

              <!-- Action Buttons -->
              <div class="detail-actions" *ngIf="isAdmin() || isManager()">
                <button class="btn-save" *ngIf="!isEditing" (click)="startEditing()">✏️ Chỉnh sửa</button>
                <button class="btn-save" *ngIf="isEditing" (click)="saveDetail()">💾 Lưu</button>
                <button class="btn-cancel" *ngIf="isEditing" (click)="cancelEditing()">Hủy</button>
                <button class="btn-danger" *ngIf="isAdmin()" (click)="deleteEmployee(selectedEmployee!)">🗑️ Xóa</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styleUrls: ['./hr.component.css'],
})
export class HrComponent implements OnInit {
    viewMode: 'kanban' | 'list' | 'detail' = 'kanban';
    detailTab = 'work';
    isEditing = false;
    selectedEmployee: Employee | null = null;
    detailForm: any = {};

    departments = signal<Department[]>([]);
    shifts = signal<Shift[]>([]);
    machines = signal<any[]>([]);
    employees = signal<Employee[]>([]);
    allEmployees = signal<Employee[]>([]);
    summary = signal<AttendanceSummary[]>([]);
    details = signal<any[]>([]);
    syncing = signal(false);

    private auth = inject(AuthService);
    isAdmin = this.auth.isAdmin;
    isManager = this.auth.isManager;
    isWorker = this.auth.isWorker;
    currentUser = this.auth.user;

    empSearch = '';
    empDeptFilter: number | undefined;

    constructor(private hrService: HrService) {}

    ngOnInit() {
        this.loadDepartments();
        this.loadEmployees();
        this.hrService.getEmployees().subscribe(r => this.allEmployees.set(r.data));
    }

    loadDepartments() { this.hrService.getDepartments().subscribe(r => this.departments.set(r.data)); }

    loadEmployees() {
        const search = this.empSearch?.trim();
        this.hrService.getEmployees({ departmentId: this.empDeptFilter, search })
            .subscribe(r => this.employees.set(r.data));
    }

    getDeptCount(deptId: number): number {
        return this.allEmployees().filter(e => e.departmentId === deptId).length;
    }

    getInitial(name: string): string {
        return name ? name.charAt(0).toUpperCase() : '?';
    }

    getAvatarColor(name: string): string {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    }

    openDetail(e: Employee) {
        this.selectedEmployee = e;
        this.viewMode = 'detail';
        this.isEditing = false;
        this.detailTab = 'work';
    }

    startEditing() {
        if (!this.selectedEmployee) return;
        this.detailForm = {
            departmentId: this.selectedEmployee.departmentId,
            position: this.selectedEmployee.position || '',
            phone: this.selectedEmployee.phone || '',
            email: this.selectedEmployee.email || '',
            joinDate: this.selectedEmployee.joinDate?.split('T')[0] || '',
            enrollNumber: this.selectedEmployee.enrollNumber || ''
        };
        this.isEditing = true;
    }

    cancelEditing() { this.isEditing = false; }

    saveDetail() {
        if (!this.selectedEmployee) return;
        this.hrService.updateEmployee(this.selectedEmployee.id, this.detailForm).subscribe({
            next: () => {
                this.isEditing = false;
                this.loadEmployees();
                // Refresh selected employee
                this.hrService.getEmployees().subscribe(r => {
                    this.allEmployees.set(r.data);
                    const updated = r.data.find(e => e.id === this.selectedEmployee!.id);
                    if (updated) this.selectedEmployee = updated;
                });
            },
            error: (e) => alert(e.error?.message || 'Lỗi cập nhật'),
        });
    }

    deleteEmployee(e: Employee) {
        if (!confirm(`Xác nhận xóa nhân viên "${e.fullName}"?`)) return;
        this.hrService.deleteEmployee(e.id).subscribe({
            next: () => {
                this.viewMode = 'kanban';
                this.selectedEmployee = null;
                this.loadEmployees();
            },
            error: (err) => alert('Lỗi: ' + (err.error?.message || err.message))
        });
    }

    openCreateModal() {
        alert('Tính năng tạo nhân viên mới sẽ được bổ sung.');
    }
}
