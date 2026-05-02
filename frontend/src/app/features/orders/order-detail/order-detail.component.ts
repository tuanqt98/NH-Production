import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, ApiResponse } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { MaterialsService } from '../../../core/services/materials.service';

@Component({
    selector: 'app-order-detail',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-wrapper detail-page">
      @if (loading()) {
        <div class="loader-wrap">
          <div class="loading-spinner"></div>
        </div>
      } @else if (order()) {
        <!-- ODOO HEADER BAR -->
        <div class="odoo-status-bar">
          <div class="action-buttons">
            <button class="btn btn-primary" (click)="workflowAction('submit_price')" *ngIf="order()!.status === 'QUOTATION'">Gửi duyệt giá</button>
            <button class="btn btn-primary" (click)="workflowAction('approve_price')" *ngIf="order()!.status === 'PRICE_PROPOSAL' && isManager()">Duyệt giá</button>
            <button class="btn btn-primary" (click)="workflowAction('confirm_order')" *ngIf="order()!.status === 'AWAITING_CONFIRM' && isManager()">Xác nhận đơn hàng</button>
            <button class="btn btn-primary" (click)="workflowAction('plan_confirm')" *ngIf="order()!.status === 'CONFIRMED' && isManager()">Xác nhận kế hoạch</button>
            <button class="btn btn-secondary" (click)="updateStatus('CANCELLED')" *ngIf="order()!.status !== 'CANCELLED' && order()!.status !== 'COMPLETED'">Hủy</button>
          </div>
          <div class="workflow-steps-arrow">
            <div class="step-arrow" [class.active]="order()!.status === 'QUOTATION'">Báo giá</div>
            <div class="step-arrow" [class.active]="order()!.status === 'PRICE_PROPOSAL'">Đề nghị duyệt giá</div>
            <div class="step-arrow" [class.active]="order()!.status === 'AWAITING_CONFIRM'">Chờ xác nhận (TK)</div>
            <div class="step-arrow" [class.active]="order()!.status === 'SALES_ORDER' || order()!.status === 'CONFIRMED'">Đơn bán hàng</div>
            <div class="step-arrow" [class.active]="order()!.status === 'IN_PROGRESS'">Đang SX</div>
            <div class="step-arrow" [class.active]="order()!.status === 'COMPLETED'">Hoàn tất</div>
          </div>
        </div>

        <div class="detail-container card">
          <!-- TOP STATS BUTTONS -->
          <div class="stats-header-buttons">
            <button class="stat-btn" [class.has-data]="order()!.materialRequirements?.length > 0">
                <div class="stat-icon">🧱</div>
                <div class="stat-label">Vật tư</div>
            </button>
            <button class="stat-btn">
                <div class="stat-icon">🕒</div>
                <div class="stat-label">{{ history().length }} Lịch sử</div>
            </button>
          </div>

          <!-- MAIN CONTENT -->
          <div class="order-header-main">
            <h1 class="order-title">{{ order()!.orderCode }}</h1>
            <div class="customer-tag">👤 {{ order()!.customer }}</div>
            <div class="status-indicator mt-2">
                <span class="status-badge" [class]="'status-' + order()!.status">
                    {{ getStatusLabel(order()!.status) }}
                </span>
            </div>
          </div>

          <div class="grid-2 mt-6">
            <div class="info-column">
                <div class="data-row">
                    <label>Sản phẩm</label>
                    <div class="value-box">
                        <span class="p-code">[{{ order()!.productCode }}]</span>
                        <span class="p-name">{{ order()!.productName || 'Chưa đặt tên' }}</span>
                    </div>
                </div>
                <div class="data-row">
                    <label>Số lượng</label>
                    <div class="value-box">
                        <strong>{{ order()!.plannedQty | number }}</strong>
                        <small>{{ order()!.unitName || 'Cái' }}</small>
                    </div>
                </div>
                <div class="data-row">
                    <label>Thông số KT</label>
                    <div class="value-box">
                        {{ order()!.length }}x{{ order()!.width }}x{{ order()!.height }} mm | {{ order()!.printColors }} màu
                    </div>
                </div>
                <div class="data-row" *ngIf="order()!.designMachine">
                    <label>Máy thiết kế</label>
                    <div class="value-box">
                        <span class="machine-pill">{{ order()!.designMachine }}</span>
                    </div>
                </div>
            </div>

            <div class="info-column">
                <div class="data-row">
                    <label>Ngày giao hàng</label>
                    <div class="value-box highlight-date">{{ order()!.dueDate | date:'dd/MM/yyyy' }}</div>
                </div>
                <div class="data-row">
                    <label>Người phụ trách</label>
                    <div class="value-box">{{ order()!.salesAccountant || '---' }}</div>
                </div>
                <div class="data-row" *ngIf="order()!.plannedStart">
                    <label>Ngày kế hoạch</label>
                    <div class="value-box">
                        {{ order()!.plannedStart | date:'dd/MM' }} → {{ order()!.plannedEnd | date:'dd/MM' }}
                    </div>
                </div>
                <div class="data-row">
                    <label>Loại BoM</label>
                    <div class="value-box">{{ order()!.bomType || 'Mặc định' }}</div>
                </div>
            </div>
          </div>

          <!-- Tabs Section -->
          <div class="detail-tabs mt-8">
            <div class="tab-header">
                <button [class.active]="activeTab === 'lines'" (click)="activeTab = 'lines'">Dòng lệnh</button>
                <button [class.active]="activeTab === 'technical'" (click)="activeTab = 'technical'">Thông tin Kỹ thuật</button>
                <button [class.active]="activeTab === 'history'" (click)="activeTab = 'history'">Lịch sử Workflow</button>
            </div>

            <!-- TAB: LINES -->
            <div class="tab-panel" *ngIf="activeTab === 'lines'">
                <table class="odoo-table">
                    <thead>
                        <tr>
                            <th>Mô tả</th>
                            <th class="text-right">Số lượng</th>
                            <th class="text-right">Đơn giá</th>
                            <th class="text-right">Thuế</th>
                            <th class="text-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <strong>{{ order()!.productName || order()!.productCode }}</strong><br>
                                <small class="text-muted">KT: {{ order()!.length }}x{{ order()!.width }}mm | Màu: {{ order()!.printColors }}</small>
                            </td>
                            <td class="text-right">{{ order()!.plannedQty | number }}</td>
                            <td class="text-right">---</td>
                            <td class="text-right">8%</td>
                            <td class="text-right font-bold">{{ (order()!.totalMaterialCost || 0) | number }} đ</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- TAB: TECHNICAL -->
            <div class="tab-panel" *ngIf="activeTab === 'technical'">
                <div class="tech-grid">
                    <div class="tech-card">
                        <h4>🎨 Thiết kế & Công cụ</h4>
                        <p><strong>Máy SX:</strong> {{ order()!.designMachine || 'Chưa chọn' }}</p>
                        <p><strong>Ngày thiết kế:</strong> {{ (order()!.designDate | date:'short') || '—' }}</p>
                        <p><strong>Ghi chú:</strong> {{ order()!.designNote || 'Không có' }}</p>
                        <div class="tools-list" *ngIf="order()!.designTools">
                            <strong>CCDC:</strong>
                            <ul>
                                <li *ngFor="let t of parseTools(order()!.designTools)">{{ t.name }} (SL: {{ t.qty }})</li>
                            </ul>
                        </div>
                    </div>
                    <div class="tech-card">
                        <h4>📅 Kế hoạch</h4>
                        <p><strong>Dự kiến BĐ:</strong> {{ (order()!.plannedStart | date:'dd/MM/yyyy') || '—' }}</p>
                        <p><strong>Dự kiến KT:</strong> {{ (order()!.plannedEnd | date:'dd/MM/yyyy') || '—' }}</p>
                        <p><strong>Ghi chú:</strong> {{ order()!.planningNote || 'Không có' }}</p>
                        <p><strong>Ngày xác nhận:</strong> {{ (order()!.planConfirmedAt | date:'short') || '—' }}</p>
                    </div>
                </div>
            </div>

            <!-- TAB: HISTORY -->
            <div class="tab-panel" *ngIf="activeTab === 'history'">
                <div class="history-timeline">
                    <div class="timeline-item" *ngFor="let h of history()">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                            <div class="timeline-header">
                                <span class="time">{{ h.createdAt | date:'short' }}</span>
                                <span class="user">👤 {{ h.user?.fullName }}</span>
                            </div>
                            <div class="timeline-body">
                                <span class="action-tag">{{ getActionLabel(h.action) }}</span>
                                <span class="status-flow">{{ h.fromStatus }} ➔ {{ h.toStatus }}</span>
                                <p class="note" *ngIf="h.note">{{ h.note }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>

        <!-- ACTIVITY LOG (Odoo Style) -->
        <div class="activity-log card mt-6">
            <h3 class="section-title">💬 Hoạt động & Ghi chú</h3>
            <div class="log-entry" *ngIf="order()!.notes">
                <div class="log-avatar">👤</div>
                <div class="log-content">
                    <div class="log-header">
                        <strong>Hệ thống</strong> · <span>{{ order()!.createdAt | date:'short' }}</span>
                    </div>
                    <div class="log-body">{{ order()!.notes }}</div>
                </div>
            </div>
            <div class="empty-log" *ngIf="!order()!.notes">Chưa có hoạt động nào được ghi lại.</div>
        </div>

      } @else {
        <div class="error-state">
            <h2>404</h2>
            <p>Không tìm thấy đơn hàng yêu cầu.</p>
            <button routerLink="/orders" class="btn btn-primary">Quay lại danh sách</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .detail-page { background: #0f0f0f; min-height: 100vh; padding: 20px; }
    .odoo-status-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #1e1e1e;
        padding: 8px 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        border: 1px solid #333;
    }
    .workflow-steps-arrow { display: flex; gap: 2px; }
    .step-arrow {
        padding: 6px 20px;
        background: #252525;
        color: #888;
        font-size: 0.75rem;
        font-weight: 600;
        clip-path: polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%, 10% 50%);
        transition: all 0.3s;
    }
    .step-arrow.active { background: #3498db; color: white; }
    .step-arrow:first-child { clip-path: polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%); border-radius: 4px 0 0 4px; }
    .step-arrow:last-child { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 10% 50%); border-radius: 0 4px 4px 0; }

    .detail-container { padding: 30px; position: relative; }
    .stats-header-buttons {
        position: absolute;
        top: 20px;
        right: 20px;
        display: flex;
        gap: 10px;
    }
    .stat-btn {
        background: #252525;
        border: 1px solid #333;
        color: #ccc;
        padding: 10px 15px;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        min-width: 100px;
    }
    .stat-btn:hover { background: #333; border-color: var(--accent-primary); }
    .stat-btn.has-data { border-color: #2ecc71; color: #2ecc71; }
    .stat-icon { font-size: 1.2rem; }
    .stat-label { font-size: 0.65rem; text-transform: uppercase; font-weight: 700; }

    .order-header-main { margin-bottom: 30px; }
    .order-title { font-size: 2rem; color: var(--accent-primary); margin-bottom: 8px; }
    .customer-tag { font-size: 1.1rem; color: #ccc; font-weight: 500; }

    .info-column { display: flex; flex-direction: column; gap: 15px; }
    .data-row { display: grid; grid-template-columns: 140px 1fr; align-items: center; }
    .data-row label { color: #888; font-size: 0.85rem; font-weight: 600; }
    .value-box { color: #eee; font-size: 0.95rem; }
    .p-code { color: var(--accent-primary); margin-right: 8px; font-weight: 700; }
    .machine-pill { background: #2c3e50; padding: 2px 10px; border-radius: 12px; font-size: 0.8rem; }
    .highlight-date { color: #e67e22; font-weight: 700; }

    .detail-tabs { border-top: 1px solid #333; }
    .tab-header { display: flex; gap: 30px; margin-bottom: 20px; }
    .tab-header button {
        background: none;
        border: none;
        color: #888;
        font-size: 0.9rem;
        font-weight: 600;
        padding: 15px 0;
        cursor: pointer;
        border-bottom: 2px solid transparent;
    }
    .tab-header button.active { color: var(--accent-primary); border-bottom-color: var(--accent-primary); }

    .odoo-table { width: 100%; border-collapse: collapse; }
    .odoo-table th { text-align: left; padding: 12px; color: #888; border-bottom: 2px solid #333; font-size: 0.8rem; text-transform: uppercase; }
    .odoo-table td { padding: 15px 12px; border-bottom: 1px solid #252525; font-size: 0.9rem; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }

    .order-summary-footer {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        margin-top: 30px;
        gap: 10px;
    }
    .summary-line { display: grid; grid-template-columns: 120px 150px; text-align: right; }
    .summary-line label { color: #888; }
    .summary-line.total { font-size: 1.4rem; color: #2ecc71; font-weight: 700; margin-top: 10px; border-top: 1px solid #333; padding-top: 10px; }

    .tech-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px; }
    .tech-card { background: #1a1a1a; padding: 20px; border-radius: 12px; border: 1px solid #333; }
    .tech-card h4 { margin-top: 0; color: var(--accent-primary); margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px; }
    .tech-card p { margin: 8px 0; font-size: 0.9rem; color: #ccc; }
    .tools-list { margin-top: 15px; padding-top: 10px; border-top: 1px dashed #333; }
    .tools-list ul { margin: 5px 0 0 20px; padding: 0; font-size: 0.85rem; color: #aaa; }

    .history-timeline { padding: 10px 0; }
    .timeline-item { position: relative; padding-left: 30px; margin-bottom: 20px; }
    .timeline-dot { position: absolute; left: 0; top: 5px; width: 12px; height: 12px; background: #3498db; border-radius: 50%; border: 3px solid #1a1a1a; }
    .timeline-item::before { content: ''; position: absolute; left: 5px; top: 17px; width: 2px; height: calc(100% + 8px); background: #333; }
    .timeline-item:last-child::before { display: none; }
    .timeline-content { background: #1e1e1e; padding: 12px 15px; border-radius: 8px; border: 1px solid #333; }
    .timeline-header { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.75rem; color: #888; }
    .action-tag { background: #333; color: #eee; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; margin-right: 10px; text-transform: uppercase; }
    .status-flow { font-size: 0.8rem; color: #5dade2; font-weight: 600; }
    .timeline-body .note { margin-top: 8px; font-size: 0.85rem; color: #999; font-style: italic; background: #161616; padding: 8px; border-radius: 4px; }

    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
    .status-QUOTATION { background: #3498db; color: white; }
    .status-PRICE_PROPOSAL { background: #f39c12; color: white; }
    .status-AWAITING_CONFIRM { background: #9b59b6; color: white; }
    .status-SALES_ORDER { background: #2ecc71; color: white; }
    .status-CONFIRMED { background: #27ae60; color: white; }
    .status-IN_PROGRESS { background: #34495e; color: white; }
    .status-COMPLETED { background: #16a085; color: white; }
  `],
})
export class OrderDetailComponent implements OnInit {
    order = signal<any>(null);
    history = signal<any[]>([]);
    loading = signal(true);
    updating = signal(false);
    activeTab = 'lines';
    
    private auth = inject(AuthService);
    isAdmin = this.auth.isAdmin;
    isManager = this.auth.isManager;

    constructor(private route: ActivatedRoute, private api: ApiService, public toast: ToastService) { }

    ngOnInit(): void {
        this.loadOrder();
        this.loadHistory();
    }

    loadOrder() {
        const id = parseInt(this.route.snapshot.paramMap.get('id')!);
        this.api.getOrder(id).subscribe({
            next: (res: ApiResponse) => {
                if (res.success) {
                    this.order.set(res.data);
                }
                this.loading.set(false);
            },
            error: () => { this.toast.error('Không thể tải thông tin lệnh'); this.loading.set(false); },
        });
    }

    loadHistory() {
        const id = parseInt(this.route.snapshot.paramMap.get('id')!);
        this.api.getOrderHistory(id).subscribe({
            next: (res: ApiResponse) => {
                if (res.success) {
                    this.history.set(res.data);
                }
            }
        });
    }

    workflowAction(action: string) {
        if (this.updating()) return;
        
        let confirmMsg = 'Bạn có chắc chắn muốn thực hiện thao tác này?';
        switch (action) {
            case 'submit_price': confirmMsg = 'Gửi báo giá đi duyệt?'; break;
            case 'approve_price': confirmMsg = 'Duyệt giá cho đơn hàng này?'; break;
            case 'confirm_order': confirmMsg = 'Xác nhận đơn hàng và tạo Lệnh SX?'; break;
            case 'plan_confirm': confirmMsg = 'Xác nhận kế hoạch và chuyển sản xuất?'; break;
        }

        if (!confirm(confirmMsg)) return;

        this.updating.set(true);
        this.api.workflowTransition(this.order().id, action).subscribe({
            next: () => {
                this.toast.success('Thao tác thành công');
                this.loadOrder();
                this.loadHistory();
                this.updating.set(false);
            },
            error: (err) => {
                this.toast.error(err.error?.message || 'Lỗi thực hiện thao tác');
                this.updating.set(false);
            }
        });
    }

    updateStatus(newStatus: string) {
        this.updating.set(true);
        this.api.updateOrder(this.order().id, { status: newStatus }).subscribe({
            next: () => {
                this.toast.success('Cập nhật thành công');
                this.loadOrder();
                this.loadHistory();
                this.updating.set(false);
            },
            error: (err) => {
                this.toast.error(err.error?.message || 'Lỗi cập nhật');
                this.updating.set(false);
            }
        });
    }

    parseTools(tools: any): any[] {
        if (!tools) return [];
        try {
            return Array.isArray(tools) ? tools : JSON.parse(tools);
        } catch { return []; }
    }

    getStatusLabel(s: string): string { 
        const map: any = { 
            DRAFT: 'Bản thảo', 
            QUOTATION: 'Báo giá', 
            PRICE_PROPOSAL: 'Chờ duyệt giá', 
            AWAITING_CONFIRM: 'Chờ xác nhận (TK)', 
            SALES_ORDER: 'Đơn bán hàng', 
            CONFIRMED: 'Đã xác nhận (KH)',
            IN_PROGRESS: 'Đang SX', 
            COMPLETED: 'Hoàn thành', 
            CANCELLED: 'Đã hủy' 
        };
        return map[s] || s; 
    }

    getActionLabel(a: string): string {
        const map: any = {
            create: 'Tạo mới',
            submit_price: 'Gửi duyệt giá',
            approve_price: 'Duyệt giá',
            confirm_order: 'Xác nhận ĐH',
            plan_confirm: 'Xác nhận KH',
            auto_generate_production: 'Tự động sinh Lệnh SX',
            mark_complete: 'Hoàn tất SX'
        };
        return map[a] || a;
    }
}
