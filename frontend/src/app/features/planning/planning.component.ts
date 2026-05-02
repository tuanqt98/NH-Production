import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
    selector: 'app-planning',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="planning-container">
        <div class="page-header">
            <div>
                <h1>🗓️ Kế hoạch — Điều độ sản xuất (V2)</h1>
                <p class="subtitle">Lập lịch sản xuất và chuẩn bị lệnh cho xưởng</p>
                <div class="debug-info">
                    <span class="status-dot" [class.loading]="isLoadingData"></span>
                    Hệ thống: {{isLoadingData ? 'ĐANG TẢI...' : 'SẴN SÀNG'}} | 
                    Lệnh chờ lập kế hoạch: {{orders.length}}
                </div>
            </div>
            <div class="header-actions">
                <button class="btn-outline" (click)="loadOrders()" [disabled]="isLoadingData">🔄 Làm mới</button>
            </div>
        </div>

        <div class="table-card">
            <div class="loading-overlay" *ngIf="isLoadingData">
                <div class="spinner"></div>
                <p>Đang tải dữ liệu kế hoạch...</p>
            </div>

            <div class="empty-state" *ngIf="orders.length === 0 && !isLoadingData">
                <div class="empty-content">
                    <span class="empty-icon">🗓️</span>
                    <h3>Chưa có lệnh sản xuất</h3>
                    <p>Không tìm thấy đơn hàng nào đã xác nhận kỹ thuật để lập kế hoạch.</p>
                    <button class="btn-primary" (click)="loadOrders()" style="margin-top: 16px;">Tải lại</button>
                </div>
            </div>

            <table *ngIf="orders.length > 0 && !isLoadingData">
                <thead>
                    <tr>
                        <th>Mã ĐH</th>
                        <th>Khách hàng</th>
                        <th>Sản phẩm</th>
                        <th>Số lượng</th>
                        <th>Hạn giao</th>
                        <th>Kế hoạch SX</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    <tr *ngFor="let order of orders" class="clickable-row">
                        <td class="order-code">{{order.orderCode}}</td>
                        <td>{{order.customer}}</td>
                        <td>
                            <div class="p-name">{{order.productName || order.productCode}}</div>
                            <div class="p-machine">Máy dự kiến: <strong>{{order.designMachine || '---'}}</strong></div>
                        </td>
                        <td class="number">{{order.plannedQty | number}}</td>
                        <td>{{order.dueDate | date:'dd/MM/yyyy'}}</td>
                        <td>
                            <div class="plan-dates" *ngIf="order.plannedStart">
                                {{order.plannedStart | date:'dd/MM'}} ➔ {{order.plannedEnd | date:'dd/MM'}}
                            </div>
                            <span class="not-set" *ngIf="!order.plannedStart">Chưa lập lịch</span>
                        </td>
                        <td (click)="$event.stopPropagation()">
                            <div class="action-buttons">
                                <button class="btn-circle" (click)="openPlanModal(order)" title="Lập lịch">📅</button>
                                <button class="btn-circle success" *ngIf="order.plannedStart" (click)="confirmToProduction(order)" title="Chuyển sản xuất">🚀</button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Plan Modal -->
        <div class="modal-overlay" *ngIf="showModal" (click)="showModal = false">
            <div class="modal" (click)="$event.stopPropagation()">
                <div class="modal-header">
                    <h2>Lập kế hoạch sản xuất — {{selectedOrder?.orderCode}}</h2>
                    <button class="close-btn" (click)="showModal = false">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Ngày bắt đầu dự kiến *</label>
                            <input type="date" [(ngModel)]="planData.plannedStart">
                        </div>
                        <div class="form-group">
                            <label>Ngày kết thúc dự kiến *</label>
                            <input type="date" [(ngModel)]="planData.plannedEnd">
                        </div>
                        <div class="form-group full">
                            <label>Ghi chú điều độ</label>
                            <textarea [(ngModel)]="planData.planningNote" rows="3" placeholder="Lưu ý cho tổ trưởng..."></textarea>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" (click)="showModal = false">Hủy</button>
                    <button class="btn-primary" (click)="savePlan()" [disabled]="saving">
                        {{saving ? 'Đang lưu...' : 'Lưu kế hoạch'}}
                    </button>
                </div>
            </div>
        </div>

        <div class="toast" *ngIf="toast.show" [class]="'toast-' + toast.type">{{toast.message}}</div>
    </div>
    `,
    styles: [`
        .planning-container { padding: 32px; max-width: 1400px; margin: 0 auto; background: #f8fafc; min-height: 100vh; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .page-header h1 { font-size: 28px; font-weight: 800; color: #0f172a; margin: 0; }
        .subtitle { color: #64748b; font-size: 15px; margin-top: 6px; }
        .debug-info { background: #fff; padding: 6px 12px; border-radius: 8px; font-size: 12px; color: #475569; margin-top: 12px; display: inline-flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; font-family: monospace; }
        .status-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; }
        .status-dot.loading { background: #f59e0b; animation: pulse 1s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

        .table-card { background: #fff; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; position: relative; min-height: 400px; border: 1px solid #e2e8f0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f8fafc; padding: 16px 20px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
        td { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; }
        
        .order-code { font-weight: 800; color: #6366f1; }
        .p-machine { font-size: 12px; color: #64748b; margin-top: 4px; }
        .number { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #0f172a; }
        .plan-dates { background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; display: inline-block; }
        .not-set { color: #94a3b8; font-style: italic; }

        .action-buttons { display: flex; gap: 8px; }
        .btn-circle { width: 36px; height: 36px; border-radius: 50%; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: 16px; }
        .btn-circle:hover { background: #f1f5f9; transform: scale(1.1); }
        .btn-circle.success:hover { background: #dcfce7; border-color: #86efac; color: #166534; }

        .loading-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.8); z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
        .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #6366f1; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }

        .empty-state { padding: 100px 40px; text-align: center; }
        .empty-icon { font-size: 64px; display: block; margin-bottom: 20px; opacity: 0.5; }

        .btn-primary { background: #6366f1; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; }
        .btn-outline { background: #fff; border: 1px solid #e2e8f0; color: #475569; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; }
        .btn-secondary { background: #f1f5f9; color: #475569; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(8px); }
        .modal { background: #fff; border-radius: 24px; width: 90%; max-width: 600px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .modal-header { padding: 32px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .modal-body { padding: 32px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .form-group { display: flex; flex-direction: column; gap: 10px; }
        .form-group.full { grid-column: span 2; }
        .form-group label { font-size: 14px; font-weight: 700; color: #334155; }
        .form-group input, .form-group textarea { padding: 12px 16px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 15px; }
        .modal-footer { padding: 24px 32px; background: #f8fafc; border-radius: 0 0 24px 24px; display: flex; justify-content: flex-end; gap: 12px; }

        .toast { position: fixed; bottom: 32px; right: 32px; padding: 16px 32px; border-radius: 16px; color: #fff; font-weight: 700; z-index: 2000; }
        .toast-success { background: #10b981; }
        .toast-error { background: #ef4444; }
    `]
})
export class PlanningComponent implements OnInit {
    orders: any[] = [];
    isLoadingData = false;
    saving = false;
    showModal = false;
    selectedOrder: any = null;
    planData = { plannedStart: '', plannedEnd: '', planningNote: '' };
    toast = { show: false, message: '', type: 'success' };

    constructor(
        private api: ApiService,
        private cdr: ChangeDetectorRef,
        private zone: NgZone,
        private router: Router
    ) {}

    ngOnInit() {
        this.loadOrders();
    }

    loadOrders() {
        if (this.isLoadingData && this.orders.length > 0) return;
        this.isLoadingData = true;
        this.cdr.detectChanges();

        this.api.getOrdersByDepartment('planning').subscribe({
            next: (res: any) => {
                this.zone.run(() => {
                    this.orders = res.data || [];
                    this.isLoadingData = false;
                });
            },
            error: (err: any) => {
                this.zone.run(() => {
                    this.isLoadingData = false;
                });
            }
        });
    }

    openPlanModal(order: any) {
        this.selectedOrder = order;
        this.planData = {
            plannedStart: order.plannedStart ? order.plannedStart.split('T')[0] : '',
            plannedEnd: order.plannedEnd ? order.plannedEnd.split('T')[0] : '',
            planningNote: order.planningNote || ''
        };
        this.showModal = true;
    }

    savePlan() {
        if (!this.planData.plannedStart || !this.planData.plannedEnd) {
            this.showToast('Vui lòng nhập đầy đủ ngày bắt đầu và kết thúc', 'error');
            return;
        }

        this.saving = true;
        this.api.updateOrder(this.selectedOrder.id, this.planData).subscribe({
            next: () => {
                this.showToast('Lưu kế hoạch thành công!', 'success');
                this.showModal = false;
                this.loadOrders();
                this.saving = false;
            },
            error: (err: any) => {
                this.showToast(err.error?.message || 'Lỗi lưu kế hoạch', 'error');
                this.saving = false;
            }
        });
    }

    confirmToProduction(order: any) {
        if (!confirm(`Chuyển đơn ${order.orderCode} xuống xưởng sản xuất?`)) return;
        
        this.api.workflowTransition(order.id, 'plan_confirm').subscribe({
            next: () => {
                this.showToast('Đã chuyển sản xuất thành công!', 'success');
                this.loadOrders();
            },
            error: (err: any) => {
                this.showToast(err.error?.message || 'Lỗi chuyển trạng thái', 'error');
            }
        });
    }

    showToast(message: string, type: 'success' | 'error') {
        this.toast = { show: true, message, type };
        setTimeout(() => this.toast.show = false, 3000);
    }
}
