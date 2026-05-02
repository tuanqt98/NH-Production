import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';

type ViewMode = 'list' | 'form';

@Component({
    selector: 'app-sales',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="premium-view">
        <!-- TOP CONTROL PANEL -->
        <div class="action-bar" *ngIf="viewMode === 'list'">
            <div class="bar-left">
                <button class="btn-premium" (click)="openCreateForm()">
                    <span>+</span> New Quotation
                </button>
            </div>
            <div class="bar-right">
                <div class="search-input-wrapper">
                    <span class="search-icon">🔍</span>
                    <input type="text" placeholder="Search orders...">
                </div>
            </div>
        </div>

        <!-- LIST VIEW -->
        <div class="list-container card-premium" *ngIf="viewMode === 'list'">
            <div class="table-responsive">
                <table class="premium-table">
                    <thead>
                        <tr>
                            <th class="check-col"><label class="custom-checkbox"><input type="checkbox"><span class="checkmark"></span></label></th>
                            <th>Order Ref</th>
                            <th>Customer</th>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Due Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let order of orders" (click)="viewOrder(order)">
                            <td class="check-col" (click)="$event.stopPropagation()"><label class="custom-checkbox"><input type="checkbox"><span class="checkmark"></span></label></td>
                            <td class="bold">{{order.orderCode}}</td>
                            <td>
                                <div class="c-flex">
                                    <img [src]="'https://ui-avatars.com/api/?name=' + order.customer + '&background=6366f1&color=fff&size=24'" class="mini-avatar">
                                    {{order.customer}}
                                </div>
                            </td>
                            <td>{{order.productName || order.productCode}}</td>
                            <td>{{order.plannedQty | number}}</td>
                            <td>{{order.dueDate | date:'MMM dd, yyyy'}}</td>
                            <td>
                                <span class="status-badge" [attr.data-status]="order.status">{{order.status}}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- FORM VIEW -->
        <div class="form-container-full" *ngIf="viewMode === 'form'">
            <!-- Floating Status Bar -->
            <div class="floating-status">
                <div class="status-actions">
                    <button class="btn-premium" (click)="confirmOrder()" *ngIf="currentOrder.status === 'QUOTATION'">Confirm Order</button>
                    <button class="btn-ghost" (click)="viewMode = 'list'">Back to List</button>
                </div>
                <div class="breadcrumb-steps">
                    <span [class.active]="currentOrder.status === 'QUOTATION'">Quotation</span>
                    <span class="sep">→</span>
                    <span [class.active]="currentOrder.status === 'SALES_ORDER'">Sales Order</span>
                    <span class="sep">→</span>
                    <span [class.active]="currentOrder.status === 'CONFIRMED'">Confirmed</span>
                </div>
            </div>

            <div class="form-content-grid">
                <div class="form-main card-premium">
                    <div class="hero-section">
                        <label>Order Reference</label>
                        <h1 class="hero-id">{{currentOrder.orderCode || 'Draft Quotation'}}</h1>
                    </div>

                    <div class="form-grid-modern">
                        <div class="input-group">
                            <label>Customer</label>
                            <div class="autocomplete-wrapper" (click)="$event.stopPropagation()">
                                <input #custInput type="text" [(ngModel)]="currentOrder.customer" 
                                       (input)="searchCustomerSuggestions(custInput.value)"
                                       (focus)="onCustomerFocus()"
                                       placeholder="Select customer...">
                                <div class="suggestions-dropdown" *ngIf="showSuggestions">
                                    <div *ngIf="suggestions.length === 0" class="no-result">No customers found</div>
                                    <div *ngFor="let s of suggestions" class="suggestion-item" (click)="selectCustomer(s)">
                                        <div class="s-main">{{s.name}}</div>
                                        <div class="s-sub">{{s.code}}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="input-group">
                            <label>Delivery Date</label>
                            <input type="date" [(ngModel)]="currentOrder.dueDate">
                        </div>
                        <div class="input-group">
                            <label>Product Reference</label>
                            <input type="text" [(ngModel)]="currentOrder.productCode" placeholder="SKU or internal code">
                        </div>
                        <div class="input-group">
                            <label>Payment Terms</label>
                            <select class="premium-select">
                                <option>Immediate Payment</option>
                                <option>Net 30 Days</option>
                                <option>Net 60 Days</option>
                            </select>
                        </div>
                    </div>

                    <div class="order-lines-section">
                        <h3 class="section-title">Order Lines</h3>
                        <table class="item-table-modern">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Quantity</th>
                                    <th>Unit Price</th>
                                    <th class="text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><input type="text" [(ngModel)]="currentOrder.productName" placeholder="Product name or description"></td>
                                    <td><input type="number" [(ngModel)]="currentOrder.plannedQty"></td>
                                    <td><input type="number" value="0"></td>
                                    <td class="text-right bold">$0.00</td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="total-block">
                            <div class="total-line">
                                <span>Total:</span>
                                <span class="total-price">$0.00</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chatter Sidebar -->
                <div class="form-side">
                    <div class="side-card card-premium">
                        <h3 class="section-title">Timeline</h3>
                        <div class="timeline">
                            <div class="t-item">
                                <div class="t-dot"></div>
                                <div class="t-content">
                                    <div class="t-header"><strong>System</strong> • Now</div>
                                    <div class="t-body">Quotation created successfully.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
  styles: [`
    .premium-view { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); min-height: 100vh; padding: 20px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    /* Action Bar - Elite */
    .action-bar { 
        display: flex; justify-content: space-between; align-items: center; 
        margin-bottom: 40px; padding: 16px 24px; background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; backdrop-filter: blur(20px);
    }
    
    .btn-premium { 
        background: var(--primary); color: #fff; border: none; padding: 12px 24px;
        border-radius: 14px; font-weight: 800; cursor: pointer; transition: all 0.3s;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    .btn-premium:hover { background: var(--primary-hover); transform: translateY(-2px); box-shadow: 0 8px 16px rgba(99, 102, 241, 0.4); }

    .btn-ghost { 
        background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1);
        padding: 12px 24px; border-radius: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s;
    }
    .btn-ghost:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); }

    .search-input-wrapper { position: relative; }
    .search-icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 18px; }
    .search-input-wrapper input { 
        padding: 14px 20px 14px 52px; border-radius: 16px; border: 1.5px solid rgba(255,255,255,0.1);
        width: 360px; outline: none; transition: all 0.3s; background: rgba(0,0,0,0.2); color: #fff;
    }

    /* List View - Elite Table */
    .list-container { 
        background: rgba(255,255,255,0.02); backdrop-filter: blur(30px); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 32px; overflow: hidden; box-shadow: var(--shadow-xl);
    }
    .premium-table { width: 100%; border-collapse: collapse; font-size: 14px; color: #fff; }
    .premium-table th { background: rgba(255,255,255,0.03); padding: 20px; text-align: left; color: var(--primary); font-family: 'Outfit'; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; font-size: 11px; }
    .premium-table td { padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,0.04); font-weight: 500; }
    .premium-table tr:hover { background: rgba(255,255,255,0.05); cursor: pointer; }
    .bold { font-weight: 800; color: #fff; }
    .c-flex { display: flex; align-items: center; gap: 12px; }
    .mini-avatar { width: 28px; height: 28px; border-radius: 8px; border: 1.5px solid rgba(255,255,255,0.1); }

    /* Status Badge */
    .status-badge { padding: 6px 14px; border-radius: 20px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
    .status-badge[data-status="QUOTATION"] { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }
    .status-badge[data-status="CONFIRMED"] { background: rgba(34, 197, 94, 0.15); color: #22c55e; box-shadow: 0 0 10px rgba(34, 197, 94, 0.2); }

    /* Form View - Luxury */
    .form-container-full { max-width: 1400px; margin: 0 auto; }
    .floating-status { 
        background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05);
        padding: 20px 32px; border-radius: 24px; display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 40px; box-shadow: var(--shadow-lg);
    }
    .status-actions { display: flex; gap: 14px; }
    .breadcrumb-steps { display: flex; align-items: center; gap: 16px; font-size: 12px; font-weight: 900; color: rgba(255,255,255,0.2); text-transform: uppercase; letter-spacing: 1px; }
    .breadcrumb-steps .active { color: var(--primary); text-shadow: 0 0 8px rgba(99, 102, 241, 0.4); }
    .breadcrumb-steps .sep { opacity: 0.3; }

    .form-content-grid { display: grid; grid-template-columns: 1fr 340px; gap: 32px; align-items: start; }
    .form-main { padding: 64px; background: rgba(255,255,255,0.02); backdrop-filter: blur(40px); border: 1px solid rgba(255,255,255,0.06); border-radius: 40px; }
    .hero-section { margin-bottom: 48px; }
    .hero-section label { font-size: 12px; font-weight: 900; text-transform: uppercase; color: var(--primary); letter-spacing: 2px; }
    .hero-id { font-size: 42px; color: #fff; margin-top: 12px; font-family: 'Outfit'; font-weight: 800; letter-spacing: -1px; }

    .form-grid-modern { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 56px; }
    .input-group { display: flex; flex-direction: column; gap: 10px; }
    .input-group label { font-size: 13px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; padding-left: 4px; }
    .input-group input, .premium-select { 
        padding: 16px 20px; border-radius: 20px; border: 1.5px solid rgba(255,255,255,0.08);
        font-size: 15px; outline: none; transition: all 0.3s; background: rgba(0,0,0,0.2); color: #fff; font-weight: 500;
    }
    .input-group input:focus { border-color: var(--primary); background: rgba(0,0,0,0.3); box-shadow: 0 0 0 5px rgba(99, 102, 241, 0.1); }

    .section-title { font-family: 'Outfit'; font-size: 18px; font-weight: 800; margin-bottom: 24px; color: #fff; display: flex; align-items: center; gap: 12px; }
    .section-title::before { content: ""; width: 4px; height: 18px; background: var(--primary); border-radius: 2px; }
    
    .item-table-modern { width: 100%; border-collapse: collapse; }
    .item-table-modern th { text-align: left; font-size: 11px; font-weight: 900; color: var(--primary); text-transform: uppercase; letter-spacing: 1.5px; padding: 16px; border-bottom: 2px solid rgba(255,255,255,0.05); }
    .item-table-modern td { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .item-table-modern input { border: none; width: 100%; outline: none; font-size: 15px; background: transparent; color: #fff; font-weight: 500; }
    .text-right { text-align: right; }

    .total-block { margin-top: 48px; display: flex; justify-content: flex-end; }
    .total-line { display: flex; gap: 64px; font-size: 32px; font-weight: 900; color: #fff; font-family: 'Outfit'; border-top: 2px solid var(--primary); padding-top: 24px; }
    .total-price { color: var(--primary); text-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }

    .side-card { padding: 32px; background: rgba(255,255,255,0.02); backdrop-filter: blur(40px); border: 1px solid rgba(255,255,255,0.06); border-radius: 32px; }
    .timeline { margin-top: 32px; }
    .t-item { display: flex; gap: 20px; margin-bottom: 32px; position: relative; }
    .t-item::before { content: ""; position: absolute; left: 7px; top: 24px; bottom: -24px; width: 2px; background: rgba(255,255,255,0.05); }
    .t-item:last-child::before { display: none; }
    .t-dot { width: 16px; height: 16px; border-radius: 50%; background: var(--primary); border: 4px solid #0a0f1d; z-index: 1; box-shadow: 0 0 10px var(--primary); }
    .t-header { font-size: 12px; font-weight: 700; color: var(--primary); margin-bottom: 6px; }
    .t-body { font-size: 14px; color: var(--text-muted); font-weight: 500; line-height: 1.5; }

    .autocomplete-wrapper { position: relative; width: 100%; }
    .suggestions-dropdown { 
        position: absolute; top: 100%; left: 0; right: 0; 
        background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.5); z-index: 1000; max-height: 300px; overflow-y: auto; margin-top: 8px; padding: 8px;
    }
    .suggestion-item { padding: 14px 20px; cursor: pointer; border-radius: 12px; transition: all 0.2s; margin-bottom: 2px; }
    .suggestion-item:hover { background: rgba(255,255,255,0.05); transform: translateX(4px); }
    .s-main { font-weight: 700; font-size: 14px; color: #fff; }
    .s-sub { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .no-result { padding: 24px; text-align: center; color: var(--text-muted); font-size: 14px; font-weight: 600; }
  `]
})
export class SalesOdooComponent implements OnInit, OnDestroy {
    viewMode: ViewMode = 'list';
    orders: any[] = [];
    currentOrder: any = this.resetOrder();
    isLoading = false;
    
    // Autocomplete
    suggestions: any[] = [];
    showSuggestions = false;
    private searchSubject = new Subject<string>();
    private searchSub?: Subscription;

    constructor(
        private api: ApiService,
        private cdr: ChangeDetectorRef,
        private zone: NgZone
    ) {
        window.onclick = () => {
            this.showSuggestions = false;
            this.cdr.detectChanges();
        };
    }

    ngOnInit() {
        this.loadOrders();
        this.searchSub = this.searchSubject.pipe(
            debounceTime(200),
            switchMap((q: string) => {
                const trimmedQ = q.trim();
                if (!trimmedQ) return this.api.getCustomers();
                return this.api.searchCustomers(trimmedQ);
            })
        ).subscribe({
            next: (res) => {
                this.suggestions = (res.data || []).slice(0, 10);
                this.showSuggestions = true;
                this.cdr.detectChanges();
            }
        });
    }

    ngOnDestroy() {
        this.searchSub?.unsubscribe();
    }

    resetOrder() {
        return {
            orderCode: '',
            customer: '',
            productCode: '',
            productName: '',
            plannedQty: 0,
            dueDate: '',
            status: 'QUOTATION'
        };
    }

    loadOrders() {
        this.isLoading = true;
        this.api.getOrdersByDepartment('sales').subscribe({
            next: (res) => {
                this.zone.run(() => {
                    this.orders = res.data || [];
                    this.isLoading = false;
                    this.cdr.detectChanges();
                });
            },
            error: () => this.isLoading = false
        });
    }

    openCreateForm() {
        this.currentOrder = this.resetOrder();
        this.viewMode = 'form';
    }

    viewOrder(order: any) {
        this.currentOrder = { ...order };
        this.viewMode = 'form';
    }

    saveOrder() {
        const request = this.currentOrder.id
            ? this.api.updateOrder(this.currentOrder.id, this.currentOrder)
            : this.api.createOrder(this.currentOrder);

        request.subscribe({
            next: () => {
                this.viewMode = 'list';
                this.loadOrders();
            },
            error: (err: any) => alert(err.error?.message || 'Lỗi lưu đơn hàng')
        });
    }

    confirmOrder() {}

    searchCustomerSuggestions(value: string) {
        this.searchSubject.next(value || '');
    }

    onCustomerFocus() {
        this.searchSubject.next(this.currentOrder.customer || '');
    }

    selectCustomer(customer: any) {
        this.currentOrder.customer = customer.name;
        this.currentOrder.customerId = customer.id;
        this.showSuggestions = false;
        this.cdr.detectChanges();
    }
}
