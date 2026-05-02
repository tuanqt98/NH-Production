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
          <h1 class="page-title">Đơn hàng & Báo giá</h1>
          <p class="page-subtitle">Quản lý toàn bộ quy trình kinh doanh và báo giá</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="loadOrders()">🔄 Tải lại</button>
          @if (auth.isAdmin() || auth.isManager()) {
            <button class="btn btn-primary" (click)="openCreate()">+ Tạo báo giá mới</button>
          }
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-box">
          <input
            class="form-input"
            type="text"
            placeholder="Tìm kiếm mã đơn, khách hàng, sản phẩm..."
            [(ngModel)]="searchQuery"
            (keyup.enter)="loadOrders()"
          />
        </div>
        <select class="form-select" [(ngModel)]="statusFilter" (change)="loadOrders()">
          <option value="">Tất cả trạng thái</option>
          <option value="QUOTATION">Báo giá</option>
          <option value="PRICE_PROPOSAL">Đề nghị duyệt giá</option>
          <option value="AWAITING_CONFIRM">Chờ xác nhận</option>
          <option value="CONFIRMED">Xác nhận đơn ĐH</option>
          <option value="SALES_ORDER">Đơn bán hàng</option>
          <option value="IN_PROGRESS">Đang sản xuất</option>
          <option value="COMPLETED">Hoàn tất sản xuất</option>
        </select>
      </div>

      <!-- Table -->
      <div class="card table-container">
        @if (loading()) {
          <div class="loader-wrap">
            <div class="loading-spinner"></div>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="odoo-table">
              <thead>
                <tr>
                  <th class="col-id">Sổ</th>
                  <th>Ngày tạo</th>
                  <th>Xác nhận</th>
                  <th>Khách hàng</th>
                  <th>Tên hàng</th>
                  <th class="text-right">Số lượng</th>
                  <th>Nhân viên</th>
                  <th>Tên máy</th>
                  <th>Trạng thái</th>
                  <th class="text-right">Tổng</th>
                  <th>BoM</th>
                  <th class="text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                @for (order of orders(); track order.id) {
                  <tr>
                    <td class="col-id"><strong>{{ order.orderCode }}</strong></td>
                    <td>{{ order.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td>{{ order.approvedDate ? (order.approvedDate | date:'dd/MM/yyyy') : '---' }}</td>
                    <td><span class="text-truncate" [title]="order.customer">{{ order.customer }}</span></td>
                    <td>
                      <div class="product-info">
                        <span class="product-code">[{{ order.productCode }}]</span>
                        <span class="product-name">{{ order.productName || 'Chưa đặt tên' }}</span>
                      </div>
                    </td>
                    <td class="text-right">
                        <span class="qty-pill">{{ order.plannedQty | number }}</span>
                        <small class="unit-text">{{ order.unitName || 'Cái' }}</small>
                    </td>
                    <td>{{ order.salesAccountant || '---' }}</td>
                    <td><span class="machine-tag">{{ order.machineTarget || '---' }}</span></td>
                    <td>
                      <span class="odoo-badge" [ngClass]="getStatusClass(order.status)">
                        {{ getStatusLabel(order.status) }}
                      </span>
                    </td>
                    <td class="text-right font-bold text-accent">
                        {{ (order.totalMaterialCost || 0) | number }} đ
                    </td>
                    <td>
                        @if (order.materialRequirements?.length > 0) {
                            <span class="bom-ok">Đủ ĐM</span>
                        } @else {
                            <span class="bom-none">Chưa ĐM</span>
                        }
                    </td>
                    <td class="text-center">
                      <div style="display: flex; gap: 4px; justify-content: center;">
                        <button [routerLink]="['/orders', order.id]" class="btn-icon" title="Xem chi tiết">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button (click)="openEdit(order)" class="btn-icon" title="Sửa thông tin">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="12" class="empty-row">
                      <div class="empty-state">
                        <span class="empty-icon">📁</span>
                        <p>Không tìm thấy đơn hàng nào khớp với bộ lọc</p>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (meta()) {
            <div class="odoo-pagination">
              <div class="pagination-info">
                {{ (meta()!.page - 1) * meta()!.limit + 1 }} - {{ meta()!.page * meta()!.limit > meta()!.total ? meta()!.total : meta()!.page * meta()!.limit }} / {{ meta()!.total }}
              </div>
              <div class="pagination-controls">
                <button [disabled]="meta()!.page <= 1" (click)="changePage(-1)">‹</button>
                <button [disabled]="meta()!.page >= meta()!.totalPages" (click)="changePage(1)">›</button>
              </div>
            </div>
          }
        }
      </div>

      <!-- Create Modal (Engine Tính toán) -->
      @if (showCreate) {
        <div class="modal-overlay" (click)="showCreate = false">
          <div class="modal-content engine-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ isEditing ? 'Chỉnh sửa đơn hàng' : 'Khai báo & Tính toán Định mức (BOM)' }}</h2>
              <button class="modal-close" (click)="showCreate = false">×</button>
            </div>

            <!-- Modal Tabs -->
            <div class="engine-tabs">
              <button class="tab-btn" [class.active]="activeTab === 'info'" (click)="activeTab = 'info'">
                <span class="tab-num">1</span> Thông tin đơn hàng
              </button>
              <button class="tab-btn" [class.active]="activeTab === 'calc'" (click)="activeTab = 'calc'">
                <span class="tab-num">2</span> Tính toán NVL
              </button>
              <button class="tab-btn" [class.active]="activeTab === 'cost'" (click)="activeTab = 'cost'">
                <span class="tab-num">3</span> Dự toán chi phí
              </button>
            </div>

            <form (ngSubmit)="saveOrder()">
              <div class="engine-body">
                
                <!-- TAB 1: THÔNG TIN CHUNG -->
                @if (activeTab === 'info') {
                  <div class="tab-content fade-in">
                    <div class="section-title">Thông tin cơ bản</div>
                    <div class="grid-3">
                      <div class="form-group">
                        <label>Mã đơn hàng *</label>
                        <input class="form-input" [(ngModel)]="newOrder.orderCode" name="orderCode" required placeholder="LSX-2026-xxx">
                      </div>
                      <div class="form-group">
                        <label>Khách hàng *</label>
                        <input class="form-input" [(ngModel)]="newOrder.customer" name="customer" required>
                      </div>
                      <div class="form-group">
                        <label>Ngày giao hàng *</label>
                        <input class="form-input" type="date" [(ngModel)]="newOrder.dueDate" name="dueDate" required>
                      </div>
                    </div>

                    <div class="grid-3">
                        <div class="form-group">
                          <label>Kế toán bán hàng</label>
                          <input class="form-input" [(ngModel)]="newOrder.salesAccountant" name="salesAccountant">
                        </div>
                        <div class="form-group">
                          <label>Loại BoM</label>
                          <select class="form-select" [(ngModel)]="newOrder.bomType" name="bomType">
                            <option value="Tiêu chuẩn">Tiêu chuẩn</option>
                            <option value="Đặc biệt">Đặc biệt</option>
                          </select>
                        </div>
                        <div class="form-group">
                          <label>Tên máy đích</label>
                          <input class="form-input" [(ngModel)]="newOrder.machineTarget" name="machineTarget" placeholder="VD: FUJI-01">
                        </div>
                    </div>

                    <div class="section-title mt-4">Thông tin sản phẩm</div>
                    <div class="grid-2">
                        <div class="form-group">
                          <label>Sản phẩm (Chọn từ danh mục)</label>
                          <select class="form-select" [(ngModel)]="newOrder.productId" name="productId" (change)="onProductChange()">
                            <option [value]="0">-- Tự nhập thông tin --</option>
                            @for (p of products(); track p.id) {
                                <option [value]="p.id">{{ p.name }} ({{ p.code }})</option>
                            }
                          </select>
                        </div>
                        <div class="form-group">
                          <label>Mã hàng *</label>
                          <input class="form-input" [(ngModel)]="newOrder.productCode" name="productCode" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Tên hàng hiển thị</label>
                        <input class="form-input" [(ngModel)]="newOrder.productName" name="productName">
                    </div>

                    <div class="grid-4">
                        <div class="form-group">
                          <label>Dài (mm)</label>
                          <input class="form-input" type="number" [(ngModel)]="newOrder.length" name="length" (change)="calculateBOM()">
                        </div>
                        <div class="form-group">
                          <label>Rộng (mm)</label>
                          <input class="form-input" type="number" [(ngModel)]="newOrder.width" name="width" (change)="calculateBOM()">
                        </div>
                        <div class="form-group">
                          <label>Số màu in</label>
                          <input class="form-input" type="number" [(ngModel)]="newOrder.printColors" name="printColors">
                        </div>
                        <div class="form-group">
                          <label>SL đặt hàng *</label>
                          <input class="form-input highlight-input" type="number" [(ngModel)]="newOrder.plannedQty" name="plannedQty" required (change)="calculateBOM()">
                        </div>
                    </div>
                  </div>
                }

                <!-- TAB 2: TÍNH TOÁN NVL -->
                @if (activeTab === 'calc') {
                  <div class="tab-content fade-in">
                    <div class="section-title">Thông số kỹ thuật sản xuất</div>
                    <div class="grid-3">
                        <div class="form-group">
                          <label>Bước nhảy/Khoảng cách xông (mm)</label>
                          <input class="form-input" type="number" [(ngModel)]="newOrder.stepDistance" name="stepDistance" (change)="calculateBOM()">
                        </div>
                        <div class="form-group">
                          <label>Số tem/cột (Ngang)</label>
                          <input class="form-input" type="number" [(ngModel)]="newOrder.numItemsPerSet" name="numItemsPerSet" (change)="calculateBOM()">
                        </div>
                        <div class="form-group">
                          <label>% Hao phí dự phòng</label>
                          <input class="form-input" type="number" [(ngModel)]="newOrder.wastePercent" name="wastePercent" (change)="calculateBOM()">
                        </div>
                    </div>

                    <div class="calc-result-box">
                        <div class="calc-row">
                            <span class="calc-label">Mét NVL chính định mức (M):</span>
                            <span class="calc-value">{{ newOrder.mainMatUsage | number:'1.2-2' }} m</span>
                        </div>
                        <div class="calc-row">
                            <span class="calc-label">Mét NVL phụ định mức (M):</span>
                            <span class="calc-value">{{ newOrder.subMatUsage | number:'1.2-2' }} m</span>
                        </div>
                        <p class="calc-hint">* Mét chạy được tính dựa trên (Dài + Bước nhảy) * SL / Số tem ngang</p>
                    </div>

                    <div class="section-title mt-4">Quy cách đóng gói</div>
                    <div class="grid-3">
                        <div class="form-group">
                          <label>Cách thức</label>
                          <select class="form-select" [(ngModel)]="newOrder.packingMethod" name="packingMethod">
                            <option value="Cuộn">Đóng cuộn</option>
                            <option value="Tờ">Cắt tờ</option>
                          </select>
                        </div>
                        <div class="form-group">
                          <label>Số lượng / Gói</label>
                          <input class="form-input" type="number" [(ngModel)]="newOrder.unitPerPack" name="unitPerPack">
                        </div>
                        <div class="form-group">
                          <label>Đơn vị tính</label>
                          <input class="form-input" [(ngModel)]="newOrder.unitName" name="unitName">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Ghi chú đóng gói</label>
                        <textarea class="form-input" [(ngModel)]="newOrder.packingSpecs" name="packingSpecs" rows="2"></textarea>
                    </div>
                  </div>
                }

                <!-- TAB 3: DỰ TOÁN CHI PHÍ -->
                @if (activeTab === 'cost') {
                    <div class="tab-content fade-in">
                        <div class="section-title">Dự toán chi phí sản xuất</div>
                        <div class="cost-summary-card">
                            <div class="cost-item">
                                <label>Tổng mét NVL chính:</label>
                                <strong>{{ newOrder.mainMatUsage }} m</strong>
                            </div>
                            <div class="cost-item">
                                <label>Giá NVL trung bình (tạm tính):</label>
                                <span>5.000 đ/m</span>
                            </div>
                            <div class="cost-total">
                                <label>TỔNG CHI PHÍ NVL DỰ KIẾN:</label>
                                <h2>{{ newOrder.totalMaterialCost | number }} VNĐ</h2>
                            </div>
                        </div>

                        <div class="section-title mt-4">Ghi chú & Chỉ dẫn đặc biệt</div>
                        <textarea class="form-input" [(ngModel)]="newOrder.notes" name="notes" rows="4" placeholder="Nhập các yêu cầu đặc biệt từ khách hàng..."></textarea>
                    </div>
                }

              </div>

              <div class="engine-footer">
                <div class="footer-left">
                    @if (activeTab !== 'info') {
                        <button type="button" class="btn btn-secondary" (click)="activeTab = activeTab === 'cost' ? 'calc' : 'info'">Quay lại</button>
                    }
                </div>
                <div class="footer-right">
                    @if (activeTab !== 'cost') {
                        <button type="button" class="btn btn-primary" (click)="activeTab = activeTab === 'info' ? 'calc' : 'cost'">Tiếp tục</button>
                    } @else {
                        <button type="submit" class="btn btn-success btn-lg" [disabled]="creating()">
                            {{ creating() ? 'Đang lưu...' : (isEditing ? '💾 Cập nhật đơn hàng' : '🚀 Xác nhận & Tạo đơn') }}
                        </button>
                    }
                </div>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .table-container {
        padding: 0;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
    }
    .odoo-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .odoo-table th {
      background: var(--bg-active);
      color: var(--text-secondary);
      font-weight: 600;
      text-align: left;
      padding: 12px 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border-color);
    }
    .odoo-table td {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.03);
      color: var(--text-primary);
      vertical-align: middle;
    }
    .odoo-table tr:hover {
      background: rgba(255,255,255,0.02);
    }
    .col-id { color: var(--accent-primary); font-weight: 600; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .text-accent { color: #2ecc71; }
    .qty-pill {
        background: rgba(46, 204, 113, 0.15);
        color: #2ecc71;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 600;
    }
    .unit-text { margin-left: 4px; color: var(--text-muted); font-size: 0.75rem; }
    .machine-tag {
        background: var(--bg-hover);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.75rem;
        border: 1px solid var(--border-color);
    }
    .product-info { display: flex; flex-direction: column; max-width: 250px; }
    .product-code { color: var(--accent-primary); font-size: 0.75rem; font-weight: 600; }
    .product-name { color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    
    /* Badges Odoo Style */
    .odoo-badge {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      display: inline-block;
      text-align: center;
    }
    .badge-draft { background: #6c757d; color: white; }
    .badge-quotation { background: #3498db; color: white; }
    .badge-proposal { background: #9b59b6; color: white; }
    .badge-awaiting { background: #f39c12; color: white; }
    .badge-confirmed { background: #27ae60; color: white; }
    .badge-sales { background: #2ecc71; color: white; }
    .badge-progress { background: #1abc9c; color: white; }
    .badge-completed { background: #27ae60; color: white; }
    .badge-cancelled { background: #e74c3c; color: white; }

    .bom-ok { color: #2ecc71; font-size: 0.7rem; border: 1px solid #2ecc71; padding: 1px 4px; border-radius: 3px; }
    .bom-none { color: #95a5a6; font-size: 0.7rem; border: 1px solid #95a5a6; padding: 1px 4px; border-radius: 3px; }

    .btn-icon {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s;
    }
    .btn-icon:hover { color: var(--accent-primary); background: var(--bg-hover); }

    .odoo-pagination {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 12px 20px;
        gap: 16px;
        color: var(--text-secondary);
        font-size: 0.8rem;
    }
    .pagination-controls button {
        background: none;
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        width: 32px;
        height: 32px;
        border-radius: 4px;
        cursor: pointer;
    }
    .pagination-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
    .pagination-controls button:hover:not(:disabled) { background: var(--bg-active); }

    /* Engine Modal Styles */
    .engine-modal {
        max-width: 900px !important;
        width: 95% !important;
        background: #1a1a1a !important;
        border: 1px solid #333 !important;
    }
    .engine-tabs {
        display: flex;
        background: #252525;
        padding: 4px;
        border-radius: 8px;
        margin-bottom: 24px;
        gap: 4px;
    }
    .tab-btn {
        flex: 1;
        padding: 12px;
        border: none;
        background: none;
        color: #888;
        cursor: pointer;
        border-radius: 6px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        transition: all 0.3s;
    }
    .tab-btn.active {
        background: var(--accent-primary);
        color: white;
    }
    .tab-num {
        width: 20px;
        height: 20px;
        background: rgba(255,255,255,0.1);
        border-radius: 50%;
        font-size: 0.7rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .tab-btn.active .tab-num { background: rgba(0,0,0,0.2); }

    .engine-body { min-height: 400px; padding: 10px 0; }
    .section-title {
        color: var(--accent-primary);
        font-size: 0.9rem;
        font-weight: 700;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #333;
    }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 16px; }
    .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; margin-bottom: 16px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px; }

    .highlight-input {
        border-color: var(--accent-primary) !important;
        background: rgba(52, 152, 219, 0.05) !important;
        font-weight: 700;
        font-size: 1.1rem !important;
    }

    .calc-result-box {
        background: #252525;
        padding: 20px;
        border-radius: 12px;
        border: 1px dashed #444;
        margin: 20px 0;
    }
    .calc-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        font-size: 1.1rem;
    }
    .calc-value { color: #2ecc71; font-weight: 700; }
    .calc-hint { color: #666; font-size: 0.75rem; margin-top: 10px; font-style: italic; }

    .cost-summary-card {
        background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
        padding: 30px;
        border-radius: 15px;
        color: white;
        margin-bottom: 24px;
        box-shadow: 0 10px 30px rgba(46, 204, 113, 0.3);
    }
    .cost-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        opacity: 0.9;
    }
    .cost-total {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid rgba(255,255,255,0.2);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
    }
    .cost-total h2 { font-size: 2.5rem; margin: 0; }

    .engine-footer {
        display: flex;
        justify-content: space-between;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #333;
    }
    .btn-success {
        background: #2ecc71;
        color: white;
        padding: 12px 30px;
        font-weight: 700;
        box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);
    }
    .btn-success:hover { background: #27ae60; transform: translateY(-2px); }

    .fade-in { animation: fadeIn 0.3s ease-in-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
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
  newOrder: any = { 
    orderCode: '', 
    productId: 0, 
    productCode: '', 
    productName: '', 
    customer: '', 
    plannedQty: 0, 
    dueDate: '', 
    notes: '',
    salesAccountant: '',
    bomType: 'Tiêu chuẩn',
    machineTarget: '',
    length: 0,
    width: 0,
    height: 0,
    printColors: 1,
    stepDistance: 0,
    numItemsPerSet: 1,
    packingMethod: 'Cuộn',
    unitPerPack: 1000,
    unitName: 'Cái',
    wastePercent: 5,
    mainMatUsage: 0,
    subMatUsage: 0,
    totalMaterialCost: 0
  };

  activeTab = 'info'; // 'info', 'calc', 'cost'
  isEditing = false;
  editingOrderId: number | null = null;
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
    public toast: ToastService,
    private materialsService: MaterialsService,
  ) { }

  ngOnInit(): void {
    this.loadOrders();
    this.loadProducts();
    this.loadMaterials();
  }

  // Engine Tính toán (Ảnh 1)
  calculateBOM(): void {
    if (!this.newOrder.plannedQty || !this.newOrder.length) return;
    
    // Giả sử logic tính mét chạy (mm -> m)
    // Định mức = (Dài + Khoảng cách xông) / 1000
    const step = this.newOrder.stepDistance || 2; // mm
    const factor = (this.newOrder.length + step) / 1000;
    
    this.newOrder.mainMatUsage = Number((factor * (this.newOrder.plannedQty / (this.newOrder.numItemsPerSet || 1))).toFixed(2));
    
    // Thêm % hao phí
    const waste = 1 + (this.newOrder.wastePercent / 100);
    this.newOrder.mainMatUsage = Number((this.newOrder.mainMatUsage * waste).toFixed(2));
    
    // Giả sử giá trung bình 5000đ/m
    this.newOrder.totalMaterialCost = Math.round(this.newOrder.mainMatUsage * 5000);
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

  saveOrder(): void {
    const selectedOps = this.availableOps
      .filter((op: any) => op.selected)
      .map((op: any, i: number) => ({ name: op.name, sequence: i + 1 }));

    if (selectedOps.length === 0) {
      this.toast.error('Vui lòng chọn ít nhất 1 công đoạn');
      return;
    }

    const materials = this.orderMaterials
      .filter(m => m.materialId > 0 && m.quantity > 0)
      .map(m => ({ materialId: m.materialId, quantity: m.quantity }));

    const payload = {
      ...this.newOrder,
      operations: selectedOps,
      materials,
    };

    this.creating.set(true);
    
    const request = this.isEditing && this.editingOrderId
      ? this.api.updateOrder(this.editingOrderId, payload)
      : this.api.createOrder(payload);

    request.subscribe({
      next: () => {
        this.toast.success(this.isEditing ? 'Cập nhật thành công!' : 'Tạo đơn hàng thành công!');
        this.closeModal();
        this.loadOrders();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Không thể lưu đơn hàng');
        this.creating.set(false);
      },
    });
  }

  openCreate(): void {
    this.isEditing = false;
    this.editingOrderId = null;
    this.resetOrderForm();
    this.showCreate = true;
  }

  openEdit(order: any): void {
    this.isEditing = true;
    this.editingOrderId = order.id;
    
    // Map order data to newOrder form
    this.newOrder = { 
        ...order,
        dueDate: order.dueDate ? new Date(order.dueDate).toISOString().substring(0, 10) : ''
    };
    
    // Map operations
    if (order.operations) {
        this.availableOps.forEach(op => {
            op.selected = order.operations.some((o: any) => o.name === op.name);
        });
    }

    // Map materials
    if (order.materialRequirements) {
        this.orderMaterials = order.materialRequirements.map((mr: any) => ({
            materialId: mr.materialId,
            quantity: mr.requiredQty,
            unit: mr.material?.unit || ''
        }));
    } else {
        this.orderMaterials = [];
    }

    this.showCreate = true;
  }

  closeModal(): void {
    this.showCreate = false;
    this.resetOrderForm();
  }

  resetOrderForm(): void {
    this.newOrder = { 
      orderCode: '', 
      productId: 0, 
      productCode: '', 
      productName: '', 
      customer: '', 
      plannedQty: 0, 
      dueDate: '', 
      notes: '',
      salesAccountant: '',
      bomType: 'Tiêu chuẩn',
      machineTarget: '',
      length: 0,
      width: 0,
      height: 0,
      printColors: 1,
      stepDistance: 0,
      numItemsPerSet: 1,
      packingMethod: 'Cuộn',
      unitPerPack: 1000,
      unitName: 'Cái',
      wastePercent: 5,
      mainMatUsage: 0,
      subMatUsage: 0,
      totalMaterialCost: 0
    };
    this.orderMaterials = [];
    this.creating.set(false);
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
