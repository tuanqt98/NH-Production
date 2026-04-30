import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ProductsService, Product } from '../../../core/services/products.service';
import { MaterialsService } from '../../../core/services/materials.service';
@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <div>
          <h1 class="page-title">Lệnh Sản Xuất</h1>
          <p class="page-subtitle">Quản lý tất cả lệnh sản xuất</p>
        </div>
        @if (auth.isAdmin() || auth.isManager()) {
          <button class="btn btn-primary" (click)="showCreate = true">+ Tạo lệnh mới</button>
        }
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <input
          class="form-input search-input"
          type="text"
          placeholder="🔍 Tìm kiếm mã lệnh, khách hàng..."
          [(ngModel)]="searchQuery"
          (keyup.enter)="loadOrders()"
        />
        <select class="form-select filter-select" [(ngModel)]="statusFilter" (change)="loadOrders()">
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Bản thảo (KD)</option>
          <option value="QUOTING">Chờ báo giá (KT)</option>
          <option value="DESIGNING">Chờ thiết kế (TK)</option>
          <option value="TECHNICAL_READY">Kỹ thuật OK (KD duyệt)</option>
          <option value="GOLD_ORDER">Đơn bán vàng (KH)</option>
          <option value="READY_TO_RUN">Sẵn sàng SX</option>
          <option value="IN_PROGRESS">Đang sản xuất</option>
          <option value="COMPLETED">Hoàn thành</option>
        </select>
      </div>

      <!-- Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        @if (loading()) {
          <div style="display:flex;justify-content:center;padding:48px;">
            <div class="loading-spinner"></div>
          </div>
        } @else {
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Mã lệnh</th>
                  <th>Mã hàng</th>
                  <th>Khách hàng</th>
                  <th>SL kế hoạch</th>
                  <th>Ngày giao</th>
                  <th>Trạng thái</th>
                  <th>Công đoạn</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (order of orders(); track order.id) {
                  <tr>
                    <td><strong>{{ order.orderCode }}</strong></td>
                    <td>{{ order.productCode }}</td>
                    <td>{{ order.customer }}</td>
                    <td>{{ order.plannedQty | number }}</td>
                    <td>{{ order.dueDate | date:'dd/MM/yyyy' }}</td>
                    <td>
                      <span class="badge" [ngClass]="getStatusClass(order.status)">
                        {{ getStatusLabel(order.status) }}
                      </span>
                    </td>
                    <td>{{ order.operations?.length || 0 }} công đoạn</td>
                    <td>
                      <a [routerLink]="['/orders', order.id]" class="btn btn-ghost btn-sm">Chi tiết →</a>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" style="text-align:center;padding:48px;color:var(--text-secondary);">
                      Không có lệnh sản xuất nào
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (meta()) {
            <div class="pagination">
              <span class="pagination-info">
                Trang {{ meta()!.page }} / {{ meta()!.totalPages }} ({{ meta()!.total }} lệnh)
              </span>
              <div class="pagination-buttons">
                <button class="btn btn-ghost btn-sm" [disabled]="meta()!.page <= 1" (click)="changePage(-1)">← Trước</button>
                <button class="btn btn-ghost btn-sm" [disabled]="meta()!.page >= meta()!.totalPages" (click)="changePage(1)">Sau →</button>
              </div>
            </div>
          }
        }
      </div>

      <!-- Create Modal -->
      @if (showCreate) {
        <div class="modal-overlay" (click)="showCreate = false">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Tạo lệnh sản xuất mới</h2>
              <button class="modal-close" (click)="showCreate = false">×</button>
            </div>
            <form (ngSubmit)="createOrder()">
              <div class="form-group">
                <label class="form-label">Mã lệnh *</label>
                <input class="form-input" [(ngModel)]="newOrder.orderCode" name="orderCode" required placeholder="VD: LSX-2026-004" />
              </div>
              <div class="form-group">
                <label class="form-label">Chọn sản phẩm (Từ danh mục)</label>
                <select class="form-input" name="productId" [(ngModel)]="newOrder.productId" (change)="onProductChange()">
                  <option [value]="0">-- Tự nhập mã hàng --</option>
                  @for (p of products(); track p.id) {
                    <option [value]="p.id">{{ p.name }} ({{ p.code }})</option>
                  }
                </select>
              </div>
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Mã hàng *</label>
                  <input class="form-input" [(ngModel)]="newOrder.productCode" name="productCode" required [disabled]="newOrder.productId > 0" />
                </div>
                <div class="form-group">
                  <label class="form-label">Số lượng *</label>
                  <input class="form-input" type="number" [(ngModel)]="newOrder.plannedQty" name="plannedQty" required />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Khách hàng *</label>
                <input class="form-input" [(ngModel)]="newOrder.customer" name="customer" required />
              </div>
              <div class="form-group">
                <label class="form-label">Kích thước (Dài x Rộng x Cao)</label>
                <div class="grid-3" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
                  <input class="form-input" type="number" [(ngModel)]="newOrder.length" name="length" placeholder="Dài">
                  <input class="form-input" type="number" [(ngModel)]="newOrder.width" name="width" placeholder="Rộng">
                  <input class="form-input" type="number" [(ngModel)]="newOrder.height" name="height" placeholder="Cao">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Ngày giao *</label>
                <input class="form-input" type="date" [(ngModel)]="newOrder.dueDate" name="dueDate" required />
              </div>
              <div class="form-group">
                <label class="form-label">Ghi chú</label>
                <textarea class="form-input form-textarea" [(ngModel)]="newOrder.notes" name="notes" rows="2"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Công đoạn</label>
                <div class="operations-checklist">
                  @for (op of availableOps; track op.name; let i = $index) {
                    <label class="op-check">
                      <input type="checkbox" [(ngModel)]="op.selected" [name]="'op_' + i" />
                      <span>{{ op.name }}</span>
                    </label>
                  }
                </div>
              </div>

              <!-- Materials Section -->
              <div class="form-group">
                <label class="form-label">📦 Nguyên vật liệu sử dụng</label>
                <div class="materials-section">
                  @for (item of orderMaterials; track item; let i = $index) {
                    <div class="material-row">
                      <select class="form-input" [(ngModel)]="item.materialId" [name]="'mat_' + i" (change)="onMaterialSelect(i)">
                        <option [ngValue]="0">-- Chọn vật tư --</option>
                        @for (m of materialsList(); track m.id) {
                          <option [ngValue]="m.id">{{ m.name }} ({{ m.code }}) - Tồn: {{ m.currentStock }} {{ m.unit }}</option>
                        }
                      </select>
                      <input class="form-input qty-input" type="number" [(ngModel)]="item.quantity" [name]="'qty_' + i" placeholder="SL" min="1">
                      <span class="unit-label">{{ item.unit || 'đvt' }}</span>
                      <button type="button" class="btn-remove" (click)="removeMaterial(i)">✕</button>
                    </div>
                  }
                  <button type="button" class="btn-add-material" (click)="addMaterial()">+ Thêm vật tư</button>
                </div>
              </div>
              <button type="submit" class="btn btn-primary btn-lg" style="width:100%;" [disabled]="creating()">
                {{ creating() ? 'Đang tạo...' : 'Tạo lệnh' }}
              </button>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .filters-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }
    .search-input {
      flex: 1;
      max-width: 400px;
    }
    .filter-select {
      width: 200px;
    }
    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-top: 1px solid var(--border-color);
    }
    .pagination-info {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .pagination-buttons {
      display: flex;
      gap: 8px;
    }
    .operations-checklist {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .op-check {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      color: var(--text-primary);
      cursor: pointer;
    }
    .op-check input[type="checkbox"] {
      accent-color: var(--accent-primary);
    }
    .materials-section { display: flex; flex-direction: column; gap: 8px; }
    .material-row { display: flex; gap: 8px; align-items: center; }
    .material-row select { flex: 2; }
    .qty-input { width: 90px !important; flex: none !important; }
    .unit-label { font-size: 0.8rem; color: var(--text-secondary); min-width: 30px; }
    .btn-remove { background: rgba(231,76,60,0.15); color: #e74c3c; border: none; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 1rem; }
    .btn-add-material { background: none; border: 1px dashed rgba(255,255,255,0.2); color: var(--text-secondary); padding: 8px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
    .btn-add-material:hover { border-color: var(--accent-primary); color: var(--accent-primary); }
  `],
})
export class OrdersListComponent implements OnInit {
  orders = signal<any[]>([]);
  meta = signal<any>(null);
  loading = signal(true);
  creating = signal(false);
  showCreate = false;

  searchQuery = '';
  statusFilter = '';
  currentPage = 1;

  products = signal<Product[]>([]);
  materialsList = signal<any[]>([]);
  orderMaterials: { materialId: number; quantity: number; unit: string }[] = [];
  newOrder: any = { orderCode: '', productId: 0, productCode: '', customer: '', plannedQty: 0, dueDate: '', notes: '', length: 0, width: 0, height: 0 };
  availableOps: any[] = [
    { name: 'In', selected: true },
    { name: 'Bế', selected: true },
    { name: 'Cán', selected: false },
    { name: 'Thành phẩm', selected: true },
  ];

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private productsService: ProductsService,
    private toast: ToastService,
    private materialsService: MaterialsService,
  ) { }

  ngOnInit(): void {
    this.loadOrders();
    this.loadProducts();
    this.loadMaterials();
  }

  loadMaterials(): void {
    this.materialsService.getMaterials().subscribe(res => {
      this.materialsList.set(res.data || []);
    });
  }

  loadProducts(): void {
    this.productsService.getProducts().subscribe(res => {
      this.products.set(res.data || []);
    });
  }

  onProductChange(): void {
    const selected = this.products().find(p => p.id == this.newOrder.productId);
    if (selected) {
      this.newOrder.productCode = selected.code;
      if (selected.templates && selected.templates.length > 0) {
        this.availableOps = selected.templates.map(t => ({ name: t.name, selected: true }));
      }
    } else {
      this.availableOps = [
        { name: 'In', selected: true },
        { name: 'Bế', selected: true },
        { name: 'Cán', selected: false },
        { name: 'Thành phẩm', selected: true },
      ];
    }
  }

  loadOrders(): void {
    this.loading.set(true);
    this.api.getOrders({
      page: this.currentPage,
      limit: 20,
      search: this.searchQuery || undefined,
      status: this.statusFilter || undefined,
    }).subscribe({
      next: (res) => {
        this.orders.set(res.data || []);
        this.meta.set(res.meta || null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  changePage(delta: number): void {
    this.currentPage += delta;
    this.loadOrders();
  }

  createOrder(): void {
    const selectedOps = this.availableOps
      .filter(op => op.selected)
      .map((op, i) => ({ name: op.name, sequence: i + 1 }));

    if (selectedOps.length === 0) {
      this.toast.error('Vui lòng chọn ít nhất 1 công đoạn');
      return;
    }

    // Filter valid materials
    const materials = this.orderMaterials
      .filter(m => m.materialId > 0 && m.quantity > 0)
      .map(m => ({ materialId: m.materialId, quantity: m.quantity }));

    this.creating.set(true);
    this.api.createOrder({
      ...this.newOrder,
      operations: selectedOps,
      materials,
    }).subscribe({
      next: () => {
        this.toast.success('Tạo lệnh sản xuất thành công!');
        this.showCreate = false;
        this.newOrder = { orderCode: '', productId: 0, productCode: '', customer: '', plannedQty: 0, dueDate: '', notes: '' };
        this.orderMaterials = [];
        this.creating.set(false);
        this.loadOrders();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Không thể tạo lệnh');
        this.creating.set(false);
      },
    });
  }

  // ─── Material helpers ──────────────────────────────────────
  addMaterial() {
    this.orderMaterials.push({ materialId: 0, quantity: 1, unit: '' });
  }
  removeMaterial(i: number) {
    this.orderMaterials.splice(i, 1);
  }
  onMaterialSelect(i: number) {
    const mat = this.materialsList().find(m => m.id === this.orderMaterials[i].materialId);
    if (mat) this.orderMaterials[i].unit = mat.unit;
  }

  getStatusClass(status: string): string {
    const map: any = { 
        DRAFT: 'badge-pending', 
        QUOTING: 'badge-info', 
        DESIGNING: 'badge-info', 
        TECHNICAL_READY: 'badge-success', 
        GOLD_ORDER: 'badge-warning', 
        READY_TO_RUN: 'badge-success',
        IN_PROGRESS: 'badge-info', 
        COMPLETED: 'badge-success', 
        CANCELLED: 'badge-error' 
    };
    return map[status] || 'badge-pending';
  }

  getStatusLabel(status: string): string {
    const map: any = { 
        DRAFT: 'Bản thảo', 
        QUOTING: 'Báo giá', 
        DESIGNING: 'Thiết kế', 
        TECHNICAL_READY: 'Kỹ thuật OK', 
        GOLD_ORDER: 'Đơn bán vàng', 
        READY_TO_RUN: 'Sẵn sàng SX',
        IN_PROGRESS: 'Đang SX', 
        COMPLETED: 'Hoàn thành', 
        CANCELLED: 'Đã hủy' 
    };
    return map[status] || status;
  }
}
