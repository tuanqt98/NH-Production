import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
    selector: 'app-design',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="design-container">
        <div class="page-header">
            <div>
                <h1>🎨 Thiết kế — Kỹ thuật & Chế bản (V2)</h1>
                <p class="subtitle">Xác nhận thông số kỹ thuật và chuẩn bị khuôn in</p>
                <div class="debug-info">
                    <span class="status-dot" [class.loading]="isLoadingData"></span>
                    Hệ thống: {{isLoadingData ? 'ĐANG TẢI...' : 'SẴN SÀNG'}} | 
                    Đơn chờ xử lý: {{orders.length}}
                </div>
            </div>
            <div class="header-actions">
                <button class="btn-outline" (click)="loadOrders()" [disabled]="isLoadingData">🔄 Làm mới</button>
            </div>
        </div>

        <div class="table-card">
            <div class="loading-overlay" *ngIf="isLoadingData">
                <div class="spinner"></div>
                <p>Đang tải dữ liệu thiết kế...</p>
            </div>

            <div class="empty-state" *ngIf="orders.length === 0 && !isLoadingData">
                <div class="empty-content">
                    <span class="empty-icon">🎨</span>
                    <h3>Chưa có đơn hàng</h3>
                    <p>Không tìm thấy đơn hàng nào cần xử lý thiết kế lúc này.</p>
                    <button class="btn-primary" (click)="loadOrders()" style="margin-top: 16px;">Tải lại</button>
                </div>
            </div>

            <table *ngIf="orders.length > 0 && !isLoadingData">
                <thead>
                    <tr>
                        <th>Mã ĐH</th>
                        <th>Khách hàng</th>
                        <th>Sản phẩm</th>
                        <th>Thông số kĩ thuật</th>
                        <th>Máy in dự kiến</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    <tr *ngFor="let order of orders" class="clickable-row">
                        <td class="order-code">{{order.orderCode}}</td>
                        <td>{{order.customer}}</td>
                        <td>
                            <div class="specs">
                                <span class="spec-tag">{{order.length}}x{{order.width}}x{{order.height}}</span>
                                <span class="spec-tag">{{order.printColors}} màu</span>
                                <span class="spec-tag">{{order.bomType}}</span>
                            </div>
                        </td>
                        <td>
                            <select [(ngModel)]="order.designMachine" class="form-select">
                                <option value="">-- Chọn máy --</option>
                                <option value="Máy In 1">Máy In 1</option>
                                <option value="Máy In 2">Máy In 2</option>
                                <option value="Máy In 3">Máy In 3</option>
                                <option value="Máy Bế">Máy Bế</option>
                            </select>
                        </td>
                        <td>
                            <span class="status-badge" [class.pending]="!order.designDate" [class.done]="order.designDate">
                                {{order.designDate ? 'Đã hoàn thành' : 'Chờ xác nhận'}}
                            </span>
                        </td>
                        <td (click)="$event.stopPropagation()">
                            <button class="btn-action" (click)="confirmDesign(order)" [disabled]="isSaving(order.id)">
                                {{isSaving(order.id) ? '...' : 'Xác nhận'}}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="toast" *ngIf="toast.show" [class]="'toast-' + toast.type">{{toast.message}}</div>
    </div>
    `,
    styles: [`
        .design-container { padding: 32px; max-width: 1400px; margin: 0 auto; background: #f8fafc; min-height: 100vh; }
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
        .specs { display: flex; gap: 4px; flex-wrap: wrap; }
        .spec-tag { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #475569; }

        .form-select { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; outline: none; width: 100%; max-width: 150px; }
        .form-select:focus { border-color: #6366f1; }

        .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }
        .status-badge.pending { background: #fef3c7; color: #92400e; }
        .status-badge.done { background: #dcfce7; color: #166534; }

        .btn-action { background: #6366f1; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .btn-action:hover { background: #4f46e5; transform: scale(1.05); }

        .loading-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.8); z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
        .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #6366f1; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .empty-state { padding: 100px 40px; text-align: center; }
        .empty-icon { font-size: 64px; display: block; margin-bottom: 20px; filter: grayscale(1); opacity: 0.5; }

        .btn-primary { background: #6366f1; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; }
        .btn-outline { background: #fff; border: 1px solid #e2e8f0; color: #475569; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; }

        .toast { position: fixed; bottom: 32px; right: 32px; padding: 16px 32px; border-radius: 16px; color: #fff; font-weight: 700; z-index: 2000; animation: slideIn 0.3s ease-out; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .toast-success { background: #10b981; }
        .toast-error { background: #ef4444; }
    `]
})
export class DesignComponent implements OnInit {
    orders: any[] = [];
    isLoadingData = false;
    savingMap: Record<number, boolean> = {}; // Lưu trạng thái cho từng đơn
    toast = { show: false, message: '', type: 'success' };

    constructor(
        private api: ApiService,
        private cdr: ChangeDetectorRef,
        private zone: NgZone
    ) {}

    ngOnInit() {
        this.loadOrders();
    }

    loadOrders() {
        if (this.isLoadingData && this.orders.length > 0) return;
        this.isLoadingData = true;
        this.cdr.detectChanges();

        this.api.getOrdersByDepartment('design').subscribe({
            next: (res) => {
                this.zone.run(() => {
                    this.orders = res.data || [];
                    this.isLoadingData = false;
                });
            },
            error: () => {
                this.zone.run(() => {
                    this.isLoadingData = false;
                });
            }
        });
    }

    confirmDesign(order: any) {
        if (!order.designMachine) {
            this.showToast('Vui lòng chọn máy in dự kiến', 'error');
            return;
        }

        this.savingMap[order.id] = true; // Chỉ khóa nút của đơn này
        this.cdr.detectChanges();

        this.api.updateOrder(order.id, { 
            designMachine: order.designMachine,
            designDate: new Date().toISOString()
        }).subscribe({
            next: () => {
                this.api.workflowTransition(order.id, 'design_confirm').subscribe({
                    next: () => {
                        this.showToast('Xác nhận thiết kế thành công!', 'success');
                        this.loadOrders();
                        delete this.savingMap[order.id];
                    },
                    error: (err) => {
                        this.showToast(err.error?.message || 'Lỗi quy trình', 'error');
                        delete this.savingMap[order.id];
                        this.cdr.detectChanges();
                    }
                });
            },
            error: (err) => {
                this.showToast(err.error?.message || 'Lỗi cập nhật', 'error');
                delete this.savingMap[order.id];
                this.cdr.detectChanges();
            }
        });
    }

    isSaving(orderId: number): boolean {
        return !!this.savingMap[orderId];
    }

    showToast(message: string, type: 'success' | 'error') {
        this.toast = { show: true, message, type };
        setTimeout(() => this.toast.show = false, 3000);
    }
}
