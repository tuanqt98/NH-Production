import { Component, OnInit, ChangeDetectorRef, NgZone, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

const AVATAR_COLORS = [
  '#E74C3C','#8E44AD','#2980B9','#27AE60','#F39C12','#D35400',
  '#1ABC9C','#C0392B','#7D3C98','#2E86C1','#148F77','#CA6F1E',
];

type ViewMode = 'kanban' | 'list' | 'form';

@Component({
    selector: 'app-customers',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="cust-module">
      <!-- Toolbar -->
      <div class="cust-toolbar" *ngIf="viewMode !== 'form'">
        <div class="toolbar-left">
          <input class="search-input" type="text" placeholder="🔍 Tìm kiếm..."
                 [(ngModel)]="searchQuery" (ngModelChange)="onSearch()">
          <input type="file" accept=".xlsx,.xls" #fileInput (change)="onFileSelected($event)" style="display:none">
        </div>
        <div class="toolbar-right">
          <span class="toolbar-info">{{customers.length}} liên hệ</span>
          <div class="view-toggle">
            <button class="view-btn" [class.active]="viewMode === 'kanban'" (click)="viewMode = 'kanban'" title="Kanban">▦</button>
            <button class="view-btn" [class.active]="viewMode === 'list'" (click)="viewMode = 'list'" title="Danh sách">☰</button>
          </div>
          <button class="btn-odoo" (click)="openCreateForm()">+ Mới</button>
          <button class="btn-import" (click)="triggerImport()">📥 Import</button>
          <button class="btn-delete" *ngIf="selectedIds.size > 0" (click)="deleteSelected()">🗑️ Xóa ({{selectedIds.size}})</button>
        </div>
      </div>

      <!-- KANBAN VIEW -->
      <div class="kanban-area" *ngIf="viewMode === 'kanban' && !isLoading">
        <div class="kanban-grid">
          <div class="cust-card" *ngFor="let c of customers" (click)="viewCustomer(c)">
            <div class="cust-avatar" [style.background]="getColor(c.name)">
              {{getInitial(c.name)}}
            </div>
            <div class="cust-card-info">
              <div class="cust-card-name">{{c.name}}</div>
              <div class="cust-card-type">{{c.isCompany ? 'Công ty' : 'Cá nhân'}}</div>
              <div class="cust-card-detail" *ngIf="c.salesPerson">
                <span class="dot"></span> {{c.salesPerson}}
              </div>
              <div class="cust-card-detail" *ngIf="c.email">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                {{c.email}}
              </div>
              <div class="cust-card-detail" *ngIf="c.phone">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.09 5.18 2 2 0 0 1 5.11 3h3a2 2 0 0 1 2 1.72c.13.81.36 1.61.68 2.36a2 2 0 0 1-.45 2.11L8.09 11.44a16 16 0 0 0 6.47 6.47l2.25-2.25a2 2 0 0 1 2.11-.45c.75.32 1.55.55 2.36.68A2 2 0 0 1 22 16.92z"/></svg>
                {{c.phone}}
              </div>
              <div class="cust-card-detail" *ngIf="c.address">
                📍 {{c.address}}
              </div>
            </div>
          </div>
        </div>
        <div class="empty-state" *ngIf="customers.length === 0">Không tìm thấy khách hàng</div>
      </div>

      <!-- LIST VIEW -->
      <div class="table-area" *ngIf="viewMode === 'list' && !isLoading">
        <table class="odoo-table">
          <thead>
            <tr>
              <th style="width:40px"><input type="checkbox" (change)="toggleSelectAll($event)" [checked]="isAllSelected()"></th>
              <th>Tên</th>
              <th>Loại</th>
              <th>Mã KH</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Nhân viên KD</th>
              <th>Địa chỉ</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of customers" (click)="viewCustomer(c)">
              <td (click)="$event.stopPropagation()"><input type="checkbox" [checked]="selectedIds.has(c.id)" (change)="toggleSelect(c.id)"></td>
              <td class="td-name">{{c.name}}</td>
              <td><span class="td-badge" [class.green]="c.isCompany">{{c.isCompany ? 'Công ty' : 'Cá nhân'}}</span></td>
              <td class="td-muted">{{c.code || '-'}}</td>
              <td class="td-muted">{{c.email || '-'}}</td>
              <td>{{c.phone || '-'}}</td>
              <td>{{c.salesPerson || '-'}}</td>
              <td class="td-muted">{{c.address || '-'}}</td>
            </tr>
          </tbody>
        </table>
        <div class="empty-state" *ngIf="customers.length === 0">Không tìm thấy khách hàng</div>
      </div>

      <!-- FORM VIEW (Detail) -->
      <div class="detail-view" *ngIf="viewMode === 'form'">
        <div class="detail-container">
          <div class="detail-header">
            <button class="back-btn" (click)="viewMode = 'kanban'">← Quay lại</button>
            <span class="detail-nav">/ Liên hệ / {{currentCustomer.name || 'Mới'}}</span>
          </div>

          <div class="detail-card">
            <div class="detail-top">
              <div class="detail-avatar" [style.background]="getColor(currentCustomer.name || 'N')">
                {{getInitial(currentCustomer.name || 'N')}}
              </div>
              <div class="detail-title">
                <input type="text" class="name-input" [(ngModel)]="currentCustomer.name" placeholder="Tên khách hàng">
                <div class="type-toggle">
                  <button [class.active]="!currentCustomer.isCompany" (click)="currentCustomer.isCompany = false">Cá nhân</button>
                  <button [class.active]="currentCustomer.isCompany" (click)="currentCustomer.isCompany = true">Công ty</button>
                </div>
              </div>
            </div>

            <div class="detail-form-grid">
              <div class="form-field">
                <label>Mã khách hàng</label>
                <input type="text" [(ngModel)]="currentCustomer.code" readonly placeholder="Tự tạo">
              </div>
              <div class="form-field">
                <label>Mã số thuế</label>
                <input type="text" [(ngModel)]="currentCustomer.taxCode" placeholder="MST">
              </div>
              <div class="form-field">
                <label>Email</label>
                <input type="email" [(ngModel)]="currentCustomer.email" placeholder="email@example.com">
              </div>
              <div class="form-field">
                <label>Số điện thoại</label>
                <input type="text" [(ngModel)]="currentCustomer.phone" placeholder="+84...">
              </div>
              <div class="form-field">
                <label>Nhân viên kinh doanh</label>
                <input type="text" [(ngModel)]="currentCustomer.salesPerson" placeholder="Người phụ trách">
              </div>
              <div class="form-field">
                <label>Website</label>
                <input type="text" [(ngModel)]="currentCustomer.website" placeholder="https://...">
              </div>
            </div>

            <div class="form-field full">
              <label>Địa chỉ</label>
              <input type="text" [(ngModel)]="currentCustomer.address" placeholder="Đường, Quận, Thành phố...">
            </div>
            <div class="form-field full">
              <label>Ghi chú</label>
              <textarea [(ngModel)]="currentCustomer.notes" rows="3" placeholder="Ghi chú nội bộ..."></textarea>
            </div>

            <div class="detail-actions">
              <button class="btn-save" (click)="saveCustomer()">💾 Lưu</button>
              <button class="btn-cancel" (click)="viewMode = 'kanban'">Hủy</button>
              <button class="btn-danger" *ngIf="currentCustomer.id" (click)="deleteCustomer(currentCustomer.id)">🗑️ Xóa</button>
            </div>
          </div>
        </div>
      </div>

      <div class="loading-overlay" *ngIf="isLoading"><div class="spinner"></div></div>
    </div>
    `,
    styles: [`
      .cust-module { display: flex; flex-direction: column; height: 100%; font-family: 'Inter', sans-serif; background: #F0F0F0; }

      .cust-toolbar {
        display: flex; align-items: center; justify-content: space-between;
        padding: 8px 16px; background: #fff; border-bottom: 1px solid #DEE2E6; flex-shrink: 0; gap: 12px;
      }
      .toolbar-left { display: flex; align-items: center; gap: 8px; }
      .toolbar-right { display: flex; align-items: center; gap: 8px; }
      .search-input {
        padding: 6px 12px; border: 1px solid #CED4DA; border-radius: 4px;
        font-size: 13px; width: 220px; outline: none; font-family: 'Inter', sans-serif;
      }
      .search-input:focus { border-color: var(--odoo-purple, #714B67); box-shadow: 0 0 0 2px rgba(113,75,103,0.1); }
      .toolbar-info { font-size: 12px; color: #6C757D; white-space: nowrap; }

      .view-toggle { display: flex; border: 1px solid #CED4DA; border-radius: 4px; overflow: hidden; }
      .view-btn { padding: 5px 10px; border: none; background: #fff; cursor: pointer; font-size: 13px; color: #6C757D; }
      .view-btn:not(:last-child) { border-right: 1px solid #CED4DA; }
      .view-btn.active { background: var(--odoo-purple, #714B67); color: #fff; }
      .view-btn:hover:not(.active) { background: #F4F6F8; }

      .btn-odoo { padding: 6px 14px; background: var(--odoo-purple, #714B67); color: #fff; border: none; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }
      .btn-odoo:hover { background: var(--odoo-purple-dark, #5B3D54); }
      .btn-import { padding: 6px 14px; background: #fff; color: #495057; border: 1px solid #CED4DA; border-radius: 4px; font-size: 13px; cursor: pointer; font-family: 'Inter', sans-serif; }
      .btn-import:hover { background: #F4F6F8; }
      .btn-delete { padding: 6px 14px; background: #DC3545; color: #fff; border: none; border-radius: 4px; font-size: 13px; cursor: pointer; font-family: 'Inter', sans-serif; }
      .btn-delete:hover { background: #C82333; }

      /* Kanban */
      .kanban-area { flex: 1; overflow-y: auto; padding: 16px; }
      .kanban-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
      .cust-card {
        background: #fff; border: 1px solid #DEE2E6; border-radius: 6px;
        padding: 14px; display: flex; gap: 14px; cursor: pointer; transition: all 0.15s;
      }
      .cust-card:hover { border-color: var(--odoo-purple, #714B67); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
      .cust-avatar {
        width: 64px; height: 64px; border-radius: 4px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        font-size: 26px; font-weight: 800; color: #fff; font-family: 'Outfit', sans-serif;
      }
      .cust-card-info { flex: 1; min-width: 0; }
      .cust-card-name { font-size: 14px; font-weight: 700; color: #212529; margin-bottom: 2px; }
      .cust-card-type { font-size: 11px; color: #27AE60; font-weight: 600; margin-bottom: 4px; }
      .cust-card-detail { font-size: 11px; color: #6C757D; display: flex; align-items: center; gap: 4px; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dot { width: 6px; height: 6px; background: var(--odoo-purple, #714B67); border-radius: 50%; flex-shrink: 0; }

      /* Table */
      .table-area { flex: 1; overflow: auto; }
      .odoo-table { width: 100%; border-collapse: collapse; background: #fff; font-size: 13px; }
      .odoo-table thead { position: sticky; top: 0; z-index: 5; }
      .odoo-table th { background: #F8F9FA; color: #495057; font-weight: 600; padding: 10px 14px; text-align: left; border-bottom: 2px solid #DEE2E6; font-size: 12px; }
      .odoo-table td { padding: 10px 14px; border-bottom: 1px solid #E9ECEF; color: #212529; }
      .odoo-table tr:hover td { background: #F8F9FA; }
      .odoo-table tbody tr { cursor: pointer; }
      .td-name { font-weight: 600; }
      .td-muted { color: #6C757D; }
      .td-badge { font-size: 11px; padding: 2px 8px; border-radius: 3px; font-weight: 600; background: #E9ECEF; color: #495057; }
      .td-badge.green { background: #D4EDDA; color: #155724; }

      /* Detail View */
      .detail-view { flex: 1; overflow-y: auto; background: #F0F0F0; }
      .detail-container { max-width: 900px; margin: 0 auto; padding: 16px; }
      .detail-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
      .back-btn { background: none; border: 1px solid #CED4DA; border-radius: 4px; padding: 5px 12px; font-size: 13px; cursor: pointer; color: #495057; font-family: 'Inter', sans-serif; }
      .back-btn:hover { background: #F4F6F8; }
      .detail-nav { font-size: 12px; color: #ADB5BD; }

      .detail-card { background: #fff; border: 1px solid #DEE2E6; border-radius: 6px; padding: 24px; }
      .detail-top { display: flex; gap: 24px; margin-bottom: 24px; }
      .detail-avatar {
        width: 90px; height: 90px; border-radius: 6px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        font-size: 36px; font-weight: 800; color: #fff; font-family: 'Outfit', sans-serif;
      }
      .detail-title { flex: 1; }
      .name-input {
        width: 100%; border: none; border-bottom: 2px solid #E9ECEF; font-size: 22px;
        font-weight: 700; padding: 6px 0; outline: none; font-family: 'Outfit', sans-serif; color: #212529;
      }
      .name-input:focus { border-bottom-color: var(--odoo-purple, #714B67); }
      .type-toggle { display: flex; margin-top: 8px; gap: 0; border: 1px solid #CED4DA; border-radius: 4px; overflow: hidden; width: fit-content; }
      .type-toggle button { border: none; padding: 4px 14px; font-size: 12px; cursor: pointer; background: #fff; color: #6C757D; font-family: 'Inter', sans-serif; }
      .type-toggle button.active { background: var(--odoo-purple, #714B67); color: #fff; }

      .detail-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px; }
      .form-field { display: flex; flex-direction: column; gap: 4px; }
      .form-field.full { grid-column: 1 / -1; margin-top: 8px; }
      .form-field label { font-size: 12px; font-weight: 600; color: #6C757D; }
      .form-field input, .form-field textarea {
        padding: 7px 10px; border: 1px solid #CED4DA; border-radius: 4px;
        font-size: 13px; font-family: 'Inter', sans-serif; color: #212529; outline: none;
      }
      .form-field input:focus, .form-field textarea:focus { border-color: var(--odoo-purple, #714B67); box-shadow: 0 0 0 2px rgba(113,75,103,0.1); }

      .detail-actions { display: flex; gap: 8px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #E9ECEF; }
      .btn-save { padding: 7px 20px; background: var(--odoo-purple, #714B67); color: #fff; border: none; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }
      .btn-save:hover { background: var(--odoo-purple-dark, #5B3D54); }
      .btn-cancel { padding: 7px 20px; background: #fff; color: #495057; border: 1px solid #CED4DA; border-radius: 4px; font-size: 13px; cursor: pointer; font-family: 'Inter', sans-serif; }
      .btn-cancel:hover { background: #F4F6F8; }
      .btn-danger { padding: 7px 20px; background: #DC3545; color: #fff; border: none; border-radius: 4px; font-size: 13px; cursor: pointer; margin-left: auto; font-family: 'Inter', sans-serif; }
      .btn-danger:hover { background: #C82333; }

      .empty-state { text-align: center; padding: 60px 20px; color: #ADB5BD; font-size: 14px; }
      .loading-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.7); }
      .spinner { width: 40px; height: 40px; border: 4px solid #E9ECEF; border-top-color: var(--odoo-purple, #714B67); border-radius: 50%; animation: spin 0.8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
    `]
})
export class CustomersComponent implements OnInit {
    viewMode: ViewMode = 'kanban';
    customers: any[] = [];
    currentCustomer: any = this.resetCustomer();
    isLoading = false;
    searchQuery = '';
    selectedIds = new Set<number>();

    constructor(private api: ApiService, private cdr: ChangeDetectorRef, private zone: NgZone) {}

    @ViewChild('fileInput') fileInput!: any;

    ngOnInit() { this.loadCustomers(); }

    getInitial(name: string): string { return name ? name.charAt(0).toUpperCase() : '?'; }
    getColor(name: string): string {
        let h = 0;
        for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
        return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
    }

    resetCustomer() {
        return { name: '', code: '', taxCode: '', phone: '', email: '', address: '', website: '', salesPerson: '', isCompany: true, notes: '' };
    }

    triggerImport() { this.fileInput.nativeElement.click(); }

    onFileSelected(event: any) {
        const file: File = event.target.files[0];
        if (file) {
            this.isLoading = true;
            this.api.importCustomers(file).subscribe({
                next: (res) => {
                    const result = res.data;
                    alert(`Import thành công!\n- Đã thêm: ${result.imported}\n- Bỏ qua: ${result.skipped}\n- Lỗi: ${result.errors.length}`);
                    this.loadCustomers();
                    event.target.value = '';
                },
                error: (err) => { alert(err.error?.message || 'Lỗi khi import'); this.isLoading = false; event.target.value = ''; }
            });
        }
    }

    loadCustomers() {
        this.isLoading = true;
        this.api.getCustomers().subscribe({
            next: (res) => { this.zone.run(() => { this.customers = res.data || []; this.isLoading = false; this.cdr.detectChanges(); }); },
            error: () => this.isLoading = false
        });
    }

    onSearch() {
        if (this.searchQuery.length > 1) {
            this.api.searchCustomers(this.searchQuery).subscribe(res => this.customers = res.data || []);
        } else if (this.searchQuery.length === 0) { this.loadCustomers(); }
    }

    toggleSelect(id: number) { this.selectedIds.has(id) ? this.selectedIds.delete(id) : this.selectedIds.add(id); }
    toggleSelectAll(event: any) { event.target.checked ? this.customers.forEach(c => this.selectedIds.add(c.id)) : this.selectedIds.clear(); }
    isAllSelected() { return this.customers.length > 0 && this.selectedIds.size === this.customers.length; }

    deleteSelected() {
        if (!confirm(`Xóa ${this.selectedIds.size} khách hàng đã chọn?`)) return;
        this.isLoading = true;
        this.api.bulkDeleteCustomers(Array.from(this.selectedIds)).subscribe({
            next: () => { this.selectedIds.clear(); this.loadCustomers(); },
            error: (err) => { alert(err.error?.message || 'Lỗi xóa'); this.isLoading = false; }
        });
    }

    openCreateForm() { this.currentCustomer = this.resetCustomer(); this.viewMode = 'form'; }
    viewCustomer(c: any) { this.currentCustomer = { ...c }; this.viewMode = 'form'; }

    saveCustomer() {
        if (!this.currentCustomer.name) { alert('Vui lòng nhập tên khách hàng'); return; }
        const req = this.currentCustomer.id
            ? this.api.updateCustomer(this.currentCustomer.id, this.currentCustomer)
            : this.api.createCustomer(this.currentCustomer);
        req.subscribe({
            next: () => { this.viewMode = 'kanban'; this.loadCustomers(); },
            error: (err) => alert(err.error?.message || 'Lỗi lưu')
        });
    }

    deleteCustomer(id: number) {
        if (!confirm('Xóa khách hàng này?')) return;
        this.api.deleteCustomer(id).subscribe({
            next: () => { this.viewMode = 'kanban'; this.loadCustomers(); },
            error: (err) => alert(err.error?.message || 'Lỗi xóa')
        });
    }
}
