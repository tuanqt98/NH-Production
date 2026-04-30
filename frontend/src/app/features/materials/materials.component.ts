import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialsService, Material } from '../../core/services/materials.service';

@Component({
    selector: 'app-materials',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="materials-container">
      <div class="header">
        <div class="title-group">
          <h1>📦 Quản lý Vật tư & Kho</h1>
          <p class="subtitle">Quản lý nguyên liệu (giấy, mực, khuôn) và tồn kho thực tế</p>
        </div>
        <div class="actions">
          <button class="btn-primary" (click)="openMaterialModal()">➕ Thêm vật tư</button>
        </div>
      </div>

      <!-- Stats / Alerts -->
      @if (alerts().length > 0) {
        <div class="stock-alerts">
          <div class="alert-banner">
            <span class="icon">⚠️</span>
            <span>Có <strong>{{ alerts().length }}</strong> loại vật tư đang dưới mức tồn tối thiểu!</span>
            <button (click)="filterByAlerts()">Xem ngay</button>
          </div>
        </div>
      }

      <!-- Search & Filters -->
      <div class="filters-card">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="Tìm tên vật tư, mã, nhà cung cấp..." [(ngModel)]="searchQuery" (input)="loadMaterials()">
        </div>
        <div class="filter-group">
          <select [(ngModel)]="selectedCategory" (change)="loadMaterials()">
            <option value="">Tất cả danh mục</option>
            @for (cat of categories(); track cat) {
              <option [value]="cat">{{ cat }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Table -->
      <div class="table-container">
        @if (loading()) {
          <div class="loading-overlay">
            <div class="spinner"></div>
          </div>
        }

        <table class="data-table">
          <thead>
            <tr>
              <th>Mã VT</th>
              <th>Tên vật tư</th>
              <th>Danh mục</th>
              <th>Đơn vị</th>
              <th>Tồn kho</th>
              <th>Min Stock</th>
              <th>Đơn giá</th>
              <th>Nhà cung cấp</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            @for (m of materials(); track m.id) {
              <tr [class.stock-low]="m.currentStock <= m.minStock">
                <td class="bold">{{ m.code }}</td>
                <td>{{ m.name }}</td>
                <td><span class="category-badge">{{ m.category }}</span></td>
                <td>{{ m.unit }}</td>
                <td [class.text-red]="m.currentStock <= m.minStock" class="bold">
                  {{ m.currentStock | number }}
                </td>
                <td>{{ m.minStock | number }}</td>
                <td>{{ (m.unitPrice || 0) | number }}đ</td>
                <td class="supplier-cell">{{ m.supplier || '-' }}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn-icon" (click)="openStockModal(m, 'IN')" title="Nhập kho">📥</button>
                    <button class="btn-icon" (click)="openStockModal(m, 'OUT')" title="Xuất kho">📤</button>
                    <button class="btn-icon" (click)="openMaterialModal(m)" title="Sửa">✏️</button>
                  </div>
                </td>
              </tr>
            }
            @if (materials().length === 0 && !loading()) {
              <tr>
                <td colspan="9" class="empty-msg">Không tìm thấy vật tư nào</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Material Edit Modal (Conditional) -->
      @if (showMaterialModal) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <h3>{{ editingMaterial?.id ? 'Chỉnh sửa vật tư' : 'Thêm vật tư mới' }}</h3>
            <form (submit)="saveMaterial($event)">
              <div class="form-grid">
                <div class="form-group">
                  <label>Mã vật tư *</label>
                  <input type="text" name="code" [(ngModel)]="materialForm.code" required placeholder="VD: G-C300">
                </div>
                <div class="form-group">
                  <label>Tên vật tư *</label>
                  <input type="text" name="name" [(ngModel)]="materialForm.name" required placeholder="VD: Giấy Couche 300">
                </div>
                <div class="form-group">
                  <label>Danh mục *</label>
                  <input type="text" name="category" [(ngModel)]="materialForm.category" required list="cat-list">
                  <datalist id="cat-list">
                    @for (cat of categories(); track cat) {
                      <option [value]="cat"></option>
                    }
                  </datalist>
                </div>
                <div class="form-group">
                  <label>Đơn vị tính *</label>
                  <input type="text" name="unit" [(ngModel)]="materialForm.unit" required placeholder="Tờ, Kg, Mét...">
                </div>
                <div class="form-group">
                  <label>Tồn tối thiểu</label>
                  <input type="number" name="minStock" [(ngModel)]="materialForm.minStock">
                </div>
                <div class="form-group">
                  <label>Đơn giá (VNĐ)</label>
                  <input type="number" name="unitPrice" [(ngModel)]="materialForm.unitPrice">
                </div>
                <div class="form-group full">
                  <label>Nhà cung cấp</label>
                  <input type="text" name="supplier" [(ngModel)]="materialForm.supplier">
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-ghost" (click)="showMaterialModal = false">Hủy</button>
                <button type="submit" class="btn-primary" [disabled]="saving()">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Stock Transaction Modal (Conditional) -->
      @if (showStockModal) {
        <div class="modal-backdrop">
          <div class="modal-card small">
            <h3>{{ stockType === 'IN' ? 'Nhập kho' : 'Xuất kho' }}</h3>
            <p>{{ selectedMaterial?.name }} ({{ selectedMaterial?.code }})</p>
            <div class="stock-info">
              Tồn hiện tại: <strong>{{ selectedMaterial?.currentStock }} {{ selectedMaterial?.unit }}</strong>
            </div>

            <form (submit)="saveStockTransaction($event)">
              <div class="form-group">
                <label>Số lượng {{ stockType === 'IN' ? 'nhập' : 'xuất' }} *</label>
                <input type="number" name="qty" [(ngModel)]="stockQty" required min="1">
              </div>
              <div class="form-group">
                <label>Lý do / Ghi chú</label>
                <textarea name="reason" [(ngModel)]="stockReason" rows="2" placeholder="VD: Nhập hàng từ NCC, Xuất cho lệnh SX..."></textarea>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-ghost" (click)="showStockModal = false">Hủy</button>
                <button type="submit" class="btn-primary" [disabled]="saving()">Xác nhận</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
    styles: [`
    .materials-container { padding: 1.5rem; max-width: 1400px; margin: 0 auto; animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

    .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; }
    .header h1 { font-size: 1.8rem; margin: 0; }
    .subtitle { color: #888; font-size: 0.9rem; margin: 0.2rem 0 0; }

    .alert-banner { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); border-radius: 12px; padding: 1rem 1.5rem; display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; color: #e74c3c; animation: pulse 2s infinite; }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.005); } 100% { transform: scale(1); } }
    .alert-banner .icon { font-size: 1.2rem; }
    .alert-banner button { margin-left: auto; border: none; background: #e74c3c; color: white; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 500; }

    .filters-card { display: flex; gap: 1rem; margin-bottom: 1.5rem; background: var(--card-bg, #1a1a2e); padding: 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
    .search-box { flex: 1; position: relative; }
    .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #666; }
    .search-box input { width: 100%; padding: 0.6rem 1rem 0.6rem 2.8rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; }
    .filter-group select { padding: 0.6rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; min-width: 180px; }

    .table-container { background: var(--card-bg, #1a1a2e); border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); position: relative; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { padding: 1rem; text-align: left; background: rgba(255,255,255,0.03); font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 1px; }
    .data-table td { padding: 0.8rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.9rem; }
    .data-table tr:hover { background: rgba(255,255,255,0.02); }
    .data-table tr.stock-low { background: rgba(231,76,60,0.03); }

    .category-badge { background: rgba(52,152,219,0.1); color: #3498db; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.75rem; }
    .bold { font-weight: 600; }
    .text-red { color: #e74c3c; }
    .supplier-cell { color: #888; font-size: 0.8rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .table-actions { display: flex; gap: 0.4rem; }
    .btn-icon { background: none; border: none; font-size: 1.1rem; cursor: pointer; padding: 0.4rem; border-radius: 6px; transition: all 0.2s; }
    .btn-icon:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); }

    .btn-primary { background: #e74c3c; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s; }
    .btn-primary:hover { filter: brightness(1.1); transform: translateY(-2px); }
    .btn-ghost { background: none; border: 1px solid rgba(255,255,255,0.2); color: #888; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }
    .btn-ghost:hover { color: white; border-color: white; }

    /* Modal */
    .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s ease; }
    .modal-card { background: #1a1a2e; width: 600px; border-radius: 20px; padding: 2rem; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .modal-card.small { width: 400px; }
    .modal-card h3 { margin-top: 0; margin-bottom: 1.5rem; font-size: 1.4rem; border-left: 4px solid #e74c3c; padding-left: 1rem; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group.full { grid-column: span 2; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
    .form-group label { font-size: 0.8rem; color: #818cf8; font-weight: 500; }
    .form-group input, .form-group textarea { padding: 0.7rem 1rem; border-radius: 10px; border: 1px solid rgba(81, 140, 248, 0.2); background: rgba(81, 140, 248, 0.05); color: white; font-size: 0.9rem; }
    .form-group input:focus { outline: none; border-color: #818cf8; background: rgba(81, 140, 248, 0.1); }

    .stock-info { background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.9rem; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; }

    .empty-msg { text-align: center; color: #666; padding: 3rem; }
    .loading-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); z-index: 10; }
    .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #e74c3c; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .form-grid { grid-template-columns: 1fr; }
      .header { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .filters-card { flex-direction: column; }
    }
  `],
})
export class MaterialsComponent implements OnInit {
    materials = signal<Material[]>([]);
    categories = signal<string[]>([]);
    alerts = signal<Material[]>([]);
    loading = signal(false);
    saving = signal(false);

    searchQuery = '';
    selectedCategory = '';

    // Modals
    showMaterialModal = false;
    showStockModal = false;
    editingMaterial: Material | null = null;
    selectedMaterial: Material | null = null;
    stockType: 'IN' | 'OUT' = 'IN';

    // Forms
    materialForm: Partial<Material> = {};
    stockQty = 0;
    stockReason = '';

    constructor(private materialsService: MaterialsService) { }

    ngOnInit() {
        this.loadMaterials();
        this.loadCategories();
        this.loadAlerts();
    }

    loadMaterials() {
        this.loading.set(true);
        this.materialsService.getMaterials(this.selectedCategory, this.searchQuery).subscribe({
            next: (res) => { this.materials.set(res.data); this.loading.set(false); },
            error: () => this.loading.set(false)
        });
    }

    loadCategories() {
        this.materialsService.getCategories().subscribe(res => this.categories.set(res.data));
    }

    loadAlerts() {
        this.materialsService.getAlerts().subscribe(res => this.alerts.set(res.data));
    }

    filterByAlerts() {
        this.materials.set(this.alerts());
        this.selectedCategory = '';
        this.searchQuery = '';
    }

    // ─── Material Modal ──────────────────────────────────────────

    openMaterialModal(material?: Material) {
        this.editingMaterial = material || null;
        this.materialForm = material ? { ...material } : {
            code: '', name: '', category: '', unit: '', minStock: 0, unitPrice: 0, supplier: ''
        };
        this.showMaterialModal = true;
    }

    saveMaterial(e: Event) {
        e.preventDefault();
        this.saving.set(true);
        const request = this.editingMaterial?.id
            ? this.materialsService.updateMaterial(this.editingMaterial.id, this.materialForm)
            : this.materialsService.createMaterial(this.materialForm);

        request.subscribe({
            next: () => {
                this.loadMaterials();
                this.loadCategories();
                this.showMaterialModal = false;
                this.saving.set(false);
            },
            error: (err) => {
                alert(err.error?.message || 'Có lỗi xảy ra');
                this.saving.set(false);
            }
        });
    }

    // ─── Stock Modal ─────────────────────────────────────────────

    openStockModal(material: Material, type: 'IN' | 'OUT') {
        this.selectedMaterial = material;
        this.stockType = type;
        this.stockQty = 0;
        this.stockReason = '';
        this.showStockModal = true;
    }

    saveStockTransaction(e: Event) {
        e.preventDefault();
        if (!this.selectedMaterial) return;

        this.saving.set(true);
        this.materialsService.createTransaction({
            materialId: this.selectedMaterial.id,
            type: this.stockType,
            quantity: this.stockQty,
            reason: this.stockReason
        }).subscribe({
            next: () => {
                this.loadMaterials();
                this.loadAlerts();
                this.showStockModal = false;
                this.saving.set(false);
            },
            error: (err) => {
                alert(err.error?.message || 'Có lỗi xảy ra');
                this.saving.set(false);
            }
        });
    }
}
