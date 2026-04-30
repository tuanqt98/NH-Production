import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-production-input',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="page-wrapper">
      <div class="page-header">
        <div>
          <h1 class="page-title">Nhập Sản Lượng</h1>
          <p class="page-subtitle">Ghi nhận sản lượng OK / NG theo công đoạn</p>
        </div>
      </div>

      <div class="grid-2">
        <!-- Input Form -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom:20px;">📝 Nhập sản lượng</h3>
          <form (ngSubmit)="submitLog()">
            <div class="form-group">
              <label class="form-label">Lệnh sản xuất *</label>
              <select class="form-input form-select" [(ngModel)]="selectedOrderId"
                name="orderId" (change)="onOrderChange()" required>
                <option [ngValue]="null">-- Chọn lệnh --</option>
                @for (order of orders(); track order.id) {
                  <option [ngValue]="order.id">
                    {{ order.orderCode }} - {{ order.customer }}
                  </option>
                }
              </select>
            </div>

            @if (operations().length > 0) {
              <div class="form-group">
                <label class="form-label">Công đoạn *</label>
                <select class="form-input form-select" [(ngModel)]="form.operationId"
                  name="operationId" required>
                  <option [ngValue]="null">-- Chọn công đoạn --</option>
                  @for (op of operations(); track op.id) {
                    <option [ngValue]="op.id">{{ op.sequence }}. {{ op.name }} ({{ op.status }})</option>
                  }
                </select>
              </div>
            }

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Số lượng OK *</label>
                <input class="form-input" type="number" [(ngModel)]="form.okQty"
                  name="okQty" min="0" required placeholder="0" />
              </div>
              <div class="form-group">
                <label class="form-label">Số lượng NG</label>
                <input class="form-input" type="number" [(ngModel)]="form.ngQty"
                  name="ngQty" min="0" placeholder="0" />
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Bắt đầu *</label>
                <input class="form-input" type="datetime-local" [(ngModel)]="form.startTime"
                  name="startTime" required />
              </div>
              <div class="form-group">
                <label class="form-label">Kết thúc *</label>
                <input class="form-input" type="datetime-local" [(ngModel)]="form.endTime"
                  name="endTime" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Ghi chú</label>
              <textarea class="form-input form-textarea" [(ngModel)]="form.notes"
                name="notes" rows="2" placeholder="VD: Ca sáng, máy 1"></textarea>
            </div>

            <button type="submit" class="btn btn-primary btn-lg"
              style="width:100%;" [disabled]="submitting()">
              {{ submitting() ? 'Đang lưu...' : '💾 Lưu sản lượng' }}
            </button>
          </form>
        </div>

        <!-- NG Range Input -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom:20px;">🔴 Nhập dải số NG</h3>
          <form (ngSubmit)="submitNgRange()">
            <div class="form-group">
              <label class="form-label">Công đoạn *</label>
              <select class="form-input form-select" [(ngModel)]="ngForm.operationId"
                name="ngOpId" required>
                <option [ngValue]="null">-- Chọn công đoạn --</option>
                @for (op of operations(); track op.id) {
                  <option [ngValue]="op.id">{{ op.name }}</option>
                }
              </select>
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Số bắt đầu *</label>
                <input class="form-input" type="number" [(ngModel)]="ngForm.rangeStart"
                  name="rangeStart" min="0" required />
              </div>
              <div class="form-group">
                <label class="form-label">Số kết thúc *</label>
                <input class="form-input" type="number" [(ngModel)]="ngForm.rangeEnd"
                  name="rangeEnd" min="0" required />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Lý do NG</label>
              <input class="form-input" [(ngModel)]="ngForm.reason" name="reason"
                placeholder="VD: Lệch mực, giấy nhăn..." />
            </div>
            <button type="submit" class="btn btn-secondary btn-lg"
              style="width:100%;border-color:var(--status-error);" [disabled]="submittingNg()">
              {{ submittingNg() ? 'Đang lưu...' : 'Lưu dải NG' }}
            </button>

            <!-- NG Check -->
            <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border-color);">
              <h4 style="color:var(--text-secondary);margin-bottom:12px;">🔍 Kiểm tra số NG</h4>
              <div style="display:flex;gap:8px;">
                <input class="form-input" type="number" [(ngModel)]="checkNumber"
                  name="checkNum" placeholder="Nhập số cần kiểm tra" style="flex:1;" />
                <button type="button" class="btn btn-secondary" (click)="checkNg()">Kiểm tra</button>
              </div>
              @if (checkResult() !== null) {
                <div class="check-result" [class.is-ng]="checkResult()?.isNg">
                  @if (checkResult()?.isNg) {
                    ❌ Số {{ checkResult()?.number }} là NG
                  } @else {
                    ✅ Số {{ checkResult()?.number }} OK
                  }
                </div>
              }
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .check-result {
      margin-top: 12px;
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      font-weight: 600;
      background: rgba(70,211,105,0.1);
      color: var(--status-success);
      border: 1px solid rgba(70,211,105,0.2);
    }
    .check-result.is-ng {
      background: rgba(229,9,20,0.1);
      color: var(--status-error);
      border-color: rgba(229,9,20,0.2);
    }
  `],
})
export class ProductionInputComponent implements OnInit {
    orders = signal<any[]>([]);
    operations = signal<any[]>([]);
    submitting = signal(false);
    submittingNg = signal(false);
    checkResult = signal<any>(null);

    selectedOrderId: number | null = null;
    checkNumber: number | null = null;

    form = {
        operationId: null as number | null,
        okQty: 0, ngQty: 0,
        startTime: '', endTime: '', notes: '',
    };

    ngForm = {
        operationId: null as number | null,
        rangeStart: 0, rangeEnd: 0, reason: '',
    };

    constructor(private api: ApiService, private toast: ToastService) { }

    ngOnInit(): void {
        this.api.getOrders({ limit: 100, status: 'IN_PROGRESS' }).subscribe(res => {
            if (res.success) this.orders.set(res.data || []);
        });
    }

    onOrderChange(): void {
        if (!this.selectedOrderId) { this.operations.set([]); return; }
        this.api.getOrder(this.selectedOrderId).subscribe(res => {
            if (res.success) this.operations.set(res.data?.operations || []);
        });
    }

    submitLog(): void {
        if (!this.form.operationId) { this.toast.error('Vui lòng chọn công đoạn'); return; }
        this.submitting.set(true);
        this.api.createLog(this.form).subscribe({
            next: () => {
                this.toast.success('Đã ghi nhận sản lượng!');
                this.form = { operationId: null, okQty: 0, ngQty: 0, startTime: '', endTime: '', notes: '' };
                this.submitting.set(false);
            },
            error: (err) => {
                this.toast.error(err.error?.message || 'Lỗi khi lưu');
                this.submitting.set(false);
            },
        });
    }

    submitNgRange(): void {
        if (!this.ngForm.operationId) { this.toast.error('Vui lòng chọn công đoạn'); return; }
        if (this.ngForm.rangeEnd < this.ngForm.rangeStart) {
            this.toast.error('Số kết thúc phải >= số bắt đầu'); return;
        }
        this.submittingNg.set(true);
        this.api.createNgRange(this.ngForm).subscribe({
            next: () => {
                this.toast.success('Đã lưu dải NG!');
                this.ngForm = { operationId: null, rangeStart: 0, rangeEnd: 0, reason: '' };
                this.submittingNg.set(false);
            },
            error: (err) => {
                this.toast.error(err.error?.message || 'Lỗi khi lưu');
                this.submittingNg.set(false);
            },
        });
    }

    checkNg(): void {
        if (this.checkNumber === null) return;
        this.api.checkNgNumber(this.checkNumber).subscribe(res => {
            if (res.success) this.checkResult.set(res.data);
        });
    }
}
