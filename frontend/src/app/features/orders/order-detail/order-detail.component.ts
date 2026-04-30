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
    <div class="page-wrapper">
      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:80px;">
          <div class="loading-spinner"></div>
        </div>
      } @else if (order()) {
        <div class="page-header">
          <div>
            <a routerLink="/orders" class="back-link">← Quay lại</a>
            <h1 class="page-title">{{ order()!.orderCode }}</h1>
            <p class="page-subtitle">{{ order()!.customer }} · {{ order()!.productCode }}</p>
          </div>
          <div style="text-align: right;">
            <span class="badge" [ngClass]="getStatusClass(order()!.status)">
              {{ getStatusLabel(order()!.status) }}
            </span>
            <div *ngIf="order()!.machineName" style="margin-top:8px; font-size:0.8rem; color:#aaa;">
               Máy: <strong>{{ order()!.machineName }}</strong>
            </div>
          </div>
        </div>

        <div class="grid-4" style="margin-bottom:24px;">
          <div class="info-card"><span class="info-label">SL Kế hoạch</span><span class="info-value">{{ order()!.plannedQty | number }}</span></div>
          <div class="info-card"><span class="info-label">Kích thước</span><span class="info-value" style="font-size:1.1rem">{{ order()!.length || 0 }} x {{ order()!.width || 0 }} x {{ order()!.height || 0 }}</span></div>
          <div class="info-card"><span class="info-label">SL OK</span><span class="info-value" style="color:var(--status-success)">{{ getTotalOk() | number }}</span></div>
          <div class="info-card"><span class="info-label">Tỷ lệ NG</span><span class="info-value" style="color:var(--status-error)">{{ getOverallNgRate() }}%</span></div>
        </div>

        <!-- Workflow Section -->
        <div class="card workflow-card" style="margin-bottom:24px;">
          <h3 class="section-title" style="margin-bottom:12px;">Quy trình xử lý đơn hàng</h3>
          
          <div class="workflow-steps">
            <!-- Step 1: Kinh doanh -->
            <div class="workflow-step" [class.active]="order()!.status === 'DRAFT'">
              <div class="step-icon">💰</div>
              <div class="step-content">
                <div class="step-title">Kinh doanh (Kích thước & NVL)</div>
                @if (order()!.status === 'DRAFT' && (isAdmin() || isManager())) {
                   <div class="step-form">
                     <div class="grid-3">
                       <input class="form-input" type="number" [(ngModel)]="editData.length" placeholder="Dài">
                       <input class="form-input" type="number" [(ngModel)]="editData.width" placeholder="Rộng">
                       <input class="form-input" type="number" [(ngModel)]="editData.height" placeholder="Cao">
                     </div>
                     <button class="btn btn-primary btn-sm" (click)="updateStatus('QUOTING')" [disabled]="updating()">Gửi Kế toán báo giá</button>
                   </div>
                } @else {
                  <div class="step-info">KT: {{ order()!.length }}x{{ order()!.width }}x{{ order()!.height }}</div>
                }
              </div>
            </div>

            <!-- Step 2: Kế toán -->
            <div class="workflow-step" [class.active]="order()!.status === 'QUOTING'">
              <div class="step-icon">🧾</div>
              <div class="step-content">
                <div class="step-title">Kế toán bán hàng (Báo giá)</div>
                @if (order()!.status === 'QUOTING' && (isAdmin() || isManager())) {
                   <button class="btn btn-primary btn-sm" (click)="updateStatus('DESIGNING')" [disabled]="updating()">Xác nhận báo giá & Gửi Thiết kế</button>
                }
              </div>
            </div>

            <!-- Step 3: Thiết kế -->
            <div class="workflow-step" [class.active]="order()!.status === 'DESIGNING'">
              <div class="step-icon">🎨</div>
              <div class="step-content">
                <div class="step-title">Thiết kế (Máy & Kỹ thuật)</div>
                @if (order()!.status === 'DESIGNING' && (isAdmin() || isManager())) {
                   <div class="step-form">
                     <input class="form-input" [(ngModel)]="editData.machineName" placeholder="Tên máy sản xuất">
                     <textarea class="form-input" [(ngModel)]="editData.designNote" placeholder="Ghi chú kỹ thuật"></textarea>
                     <button class="btn btn-primary btn-sm" (click)="updateStatus('TECHNICAL_READY')" [disabled]="updating()">Hoàn tất thiết kế</button>
                   </div>
                } @else {
                   <div class="step-info">Máy: {{ order()!.machineName || '-' }}</div>
                }
              </div>
            </div>

             <!-- Step 4: Duyệt GOLD ORDER -->
             <div class="workflow-step" [class.active]="order()!.status === 'TECHNICAL_READY'">
              <div class="step-icon">⭐</div>
              <div class="step-content">
                <div class="step-title">Duyệt Đơn bán vàng (Kinh doanh)</div>
                @if (order()!.status === 'TECHNICAL_READY' && (isAdmin() || isManager())) {
                   <button class="btn btn-success btn-sm" (click)="updateStatus('GOLD_ORDER')" [disabled]="updating()">Duyệt Đơn bán vàng</button>
                }
              </div>
            </div>

            <!-- Step 5: Kế hoạch -->
            <div class="workflow-step" [class.active]="order()!.status === 'GOLD_ORDER' || order()!.status === 'PLANNING'">
              <div class="step-icon">📅</div>
              <div class="step-content">
                <div class="step-title">Kế hoạch & Vật tư</div>
                @if ((order()!.status === 'GOLD_ORDER' || order()!.status === 'PLANNING') && (isAdmin() || isManager())) {
                   <div class="step-form">
                     <div class="grid-2">
                       <input class="form-input" type="date" [(ngModel)]="editData.plannedStart" placeholder="Bắt đầu dự kiến">
                       <input class="form-input" type="date" [(ngModel)]="editData.plannedEnd" placeholder="Kết thúc dự kiến">
                     </div>
                     <button class="btn btn-primary btn-sm" (click)="updateStatus('READY_TO_RUN')" [disabled]="updating()">Đủ vật tư & Chuyển Sản xuất</button>
                   </div>
                }
              </div>
            </div>
          </div>
        </div>

        <div class="grid-2">
           <!-- Section: Technical Specs (KD) -->
           <div class="card" style="padding:20px;">
             <h3 class="section-title">📏 Thông số kỹ thuật (KD)</h3>
             <div class="step-form" style="background:none; padding:0;">
                <div class="grid-3" style="margin-bottom:12px;">
                  <div class="form-group">
                    <label class="form-label">Dài</label>
                    <input class="form-input" type="number" [(ngModel)]="editData.length">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Rộng</label>
                    <input class="form-input" type="number" [(ngModel)]="editData.width">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Cao</label>
                    <input class="form-input" type="number" [(ngModel)]="editData.height">
                  </div>
                </div>
                <button class="btn btn-ghost btn-sm" (click)="saveDraft()" [disabled]="updating()">Lưu thông số</button>
             </div>
           </div>

           <!-- Section: Design (Thiết kế) -->
           <div class="card" style="padding:20px;">
             <h3 class="section-title">🎨 Thiết kế & Máy móc</h3>
             <div class="step-form" style="background:none; padding:0;">
                <div class="form-group" style="margin-bottom:12px;">
                  <label class="form-label">Máy sản xuất</label>
                  <input class="form-input" [(ngModel)]="editData.machineName" placeholder="Chọn máy...">
                </div>
                <div class="form-group" style="margin-bottom:12px;">
                  <label class="form-label">Ghi chú kỹ thuật</label>
                  <textarea class="form-input" [(ngModel)]="editData.designNote" rows="2"></textarea>
                </div>
                <button class="btn btn-ghost btn-sm" (click)="saveDraft()" [disabled]="updating()">Lưu thông tin thiết kế</button>
             </div>
           </div>
        </div>

        <h2 class="section-title" style="margin-top:24px;">Công đoạn sản xuất</h2>
        <div class="operations-list">
          @for (op of order()!.operations; track op.id) {
            <div class="operation-card" [class.expanded]="expandedOp === op.id">
              <div class="op-header" (click)="expandedOp = expandedOp === op.id ? null : op.id">
                <div class="op-sequence">{{ op.sequence }}</div>
                <div class="op-info">
                  <span class="op-name">{{ op.name }}</span>
                  <span class="op-stats">OK: {{ op.aggregate?.totalOk || 0 }} · NG: {{ op.aggregate?.totalNg || 0 }}</span>
                </div>
                <span class="badge" [ngClass]="getOpStatusClass(op.status)">{{ op.status }}</span>
                <span class="op-expand">{{ expandedOp === op.id ? '▼' : '▶' }}</span>
              </div>
              @if (expandedOp === op.id) {
                <div class="op-detail animate-fade-in">
                  <div class="progress-bar-container">
                    <div class="progress-bar" [style.width.%]="getOpProgress(op)">{{ getOpProgress(op) | number:'1.0-0' }}%</div>
                  </div>
                  @if (op.productionLogs?.length > 0) {
                    <h4 style="margin:16px 0 8px;color:var(--text-secondary);">Nhật ký sản xuất</h4>
                    <table class="data-table">
                      <thead><tr><th>Nhân viên</th><th>OK</th><th>NG</th><th>Bắt đầu</th><th>Kết thúc</th></tr></thead>
                      <tbody>
                        @for (log of op.productionLogs; track log.id) {
                          <tr>
                            <td>{{ log.user?.fullName }}</td>
                            <td style="color:var(--status-success)">{{ log.okQty | number }}</td>
                            <td style="color:var(--status-error)">{{ log.ngQty | number }}</td>
                            <td>{{ log.startTime | date:'HH:mm dd/MM' }}</td>
                            <td>{{ log.endTime | date:'HH:mm dd/MM' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  } @else {
                    <p style="text-align:center;color:var(--text-secondary);padding:20px;">Chưa có log</p>
                  }
                  @if (op.ngRanges?.length > 0) {
                    <h4 style="margin:16px 0 8px;color:var(--text-secondary);">Dải số NG</h4>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                      @for (r of op.ngRanges; track r.id) {
                        <span class="ng-tag">{{ r.rangeStart }}-{{ r.rangeEnd }} @if(r.reason){({{ r.reason }})}</span>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <p style="text-align:center;padding:80px;color:var(--text-secondary);">Không tìm thấy lệnh</p>
      }
    </div>
  `,
    styles: [`
    .back-link { font-size:0.85rem; color:var(--text-secondary); display:inline-block; margin-bottom:8px; }
    .back-link:hover { color:var(--text-primary); }
    .info-card { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:20px; display:flex; flex-direction:column; gap:6px; }
    .info-label { font-size:0.8rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; }
    .info-value { font-size:1.4rem; font-weight:700; color:var(--text-bright); }
    .section-title { font-size:1.2rem; font-weight:600; color:var(--text-bright); margin-bottom:16px; }
    .operations-list { display:flex; flex-direction:column; gap:12px; }
    .operation-card { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); overflow:hidden; }
    .operation-card:hover,.operation-card.expanded { border-color:var(--border-light); }
    .op-header { display:flex; align-items:center; gap:16px; padding:18px 20px; cursor:pointer; }
    .op-header:hover { background:var(--bg-hover); }
    .op-sequence { width:36px; height:36px; border-radius:50%; background:var(--bg-active); display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--text-bright); }
    .op-info { flex:1; display:flex; flex-direction:column; }
    .op-name { font-weight:600; color:var(--text-bright); }
    .op-stats { font-size:0.8rem; color:var(--text-secondary); margin-top:2px; }
    .op-expand { color:var(--text-muted); font-size:0.8rem; }
    .op-detail { padding:0 20px 20px; border-top:1px solid var(--border-color); }
    .progress-bar-container { width:100%; height:24px; background:var(--bg-secondary); border-radius:12px; overflow:hidden; margin-top:16px; }
    .progress-bar { height:100%; background:var(--accent-gradient); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:600; color:white; min-width:40px; }
    .ng-tag { padding:6px 12px; background:rgba(229,9,20,0.1); border:1px solid rgba(229,9,20,0.2); border-radius:var(--radius-sm); font-size:0.8rem; color:var(--status-error); }
    
    .workflow-card { padding: 24px; border: 1px solid rgba(81,140,248,0.2); background: rgba(81,140,248,0.05); }
    .workflow-steps { display: flex; flex-direction: column; gap: 20px; position: relative; }
    .workflow-steps::before { content: ''; position: absolute; left: 19px; top: 20px; bottom: 20px; width: 2px; background: rgba(255,255,255,0.1); z-index: 0; }
    .workflow-step { display: flex; gap: 20px; position: relative; z-index: 1; opacity: 0.5; filter: grayscale(1); transition: all 0.3s; }
    .workflow-step.active { opacity: 1; filter: none; }
    .step-icon { width: 40px; height: 40px; border-radius: 50%; background: var(--bg-surface); border: 2px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
    .workflow-step.active .step-icon { border-color: var(--accent-primary); box-shadow: 0 0 15px rgba(81,140,248,0.4); }
    .step-content { flex: 1; }
    .step-title { font-weight: 600; color: var(--text-bright); margin-bottom: 8px; }
    .step-form { display: flex; flex-direction: column; gap: 12px; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; margin-top: 10px; }
    .step-info { font-size: 0.85rem; color: var(--text-secondary); }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  `],
})
export class OrderDetailComponent implements OnInit {
    order = signal<any>(null);
    loading = signal(true);
    updating = signal(false);
    expandedOp: number | null = null;
    
    editData: any = {};

    private auth = inject(AuthService);
    isAdmin = this.auth.isAdmin;
    isManager = this.auth.isManager;

    constructor(private route: ActivatedRoute, private api: ApiService, private toast: ToastService) { }

    ngOnInit(): void {
        this.loadOrder();
    }

    loadOrder() {
        const id = parseInt(this.route.snapshot.paramMap.get('id')!);
        this.api.getOrder(id).subscribe({
            next: (res: ApiResponse) => {
                if (res.success) {
                    this.order.set(res.data);
                    this.editData = { 
                        length: res.data.length,
                        width: res.data.width,
                        height: res.data.height,
                        machineName: res.data.machineName,
                        designNote: res.data.designNote,
                        plannedStart: res.data.plannedStart?.split('T')[0],
                        plannedEnd: res.data.plannedEnd?.split('T')[0],
                    };
                }
                this.loading.set(false);
            },
            error: () => { this.toast.error('Không thể tải thông tin lệnh'); this.loading.set(false); },
        });
    }

    saveDraft() {
        this.updating.set(true);
        this.api.updateOrder(this.order().id, this.editData).subscribe({
            next: () => {
                this.toast.success('Đã lưu thông tin');
                this.loadOrder();
                this.updating.set(false);
            },
            error: (err) => {
                this.toast.error(err.error?.message || 'Lỗi lưu thông tin');
                this.updating.set(false);
            }
        });
    }

    updateStatus(newStatus: string) {
        this.updating.set(true);
        const data = { ...this.editData, status: newStatus };
        this.api.updateOrder(this.order().id, data).subscribe({
            next: () => {
                this.toast.success('Cập nhật trạng thái thành công');
                this.loadOrder();
                this.updating.set(false);
            },
            error: (err) => {
                this.toast.error(err.error?.message || 'Lỗi cập nhật');
                this.updating.set(false);
            }
        });
    }

    getTotalOk(): number {
        return this.order()?.operations?.reduce((s: number, o: any) => s + (o.aggregate?.totalOk || 0), 0) || 0;
    }

    getOverallNgRate(): string {
        const ops = this.order()?.operations || [];
        const ok = ops.reduce((s: number, o: any) => s + (o.aggregate?.totalOk || 0), 0);
        const ng = ops.reduce((s: number, o: any) => s + (o.aggregate?.totalNg || 0), 0);
        return ok + ng > 0 ? ((ng / (ok + ng)) * 100).toFixed(2) : '0.00';
    }

    getOpProgress(op: any): number {
        const planned = this.order()?.plannedQty || 1;
        return Math.min(((op.aggregate?.totalOk || 0) / planned) * 100, 100);
    }

    getStatusClass(s: string): string { 
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
        return map[s] || 'badge-pending'; 
    }
    getStatusLabel(s: string): string { 
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
        return map[s] || s; 
    }
    getOpStatusClass(s: string): string { return ({ WAITING: 'badge-pending', IN_PROGRESS: 'badge-info', COMPLETED: 'badge-success' } as any)[s] || 'badge-pending'; }
}
