import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';

type ViewMode = 'list' | 'form';
const STATUSES = ['QUOTATION', 'PRICE_REVIEW', 'CONFIRMED', 'SO_CONFIRM', 'SALES_ORDER', 'PRODUCTION_DONE'];
const STATUS_LABELS: Record<string, string> = {
  'QUOTATION': 'Báo giá',
  'PRICE_REVIEW': 'Đề nghị duyệt giá',
  'CONFIRMED': 'Chờ xác nhận',
  'SO_CONFIRM': 'Xác nhận đơn ĐH',
  'SALES_ORDER': 'Đơn bán hàng',
  'PRODUCTION_DONE': 'Hoàn tất sản xuất'
};

@Component({
    selector: 'app-sales',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './sales.component.html',
    styleUrls: ['./sales.component.css']
})
export class SalesOdooComponent implements OnInit, OnDestroy {
    viewMode: ViewMode = 'list';
    orders: any[] = [];
    currentOrder: any = this.resetOrder();
    isLoading = false;
    detailTab = 'lines';
    STATUSES = STATUSES;
    STATUS_LABELS = STATUS_LABELS;

    // Timeline/Chatter mock data
    timeline = [
        { user: 'Lê Thị Thu Phương', action: 'Xác nhận đơn DH', time: '7 giờ trước', status: 'Đơn bán hàng', color: '#8E44AD' },
        { user: 'Đỗ Minh Phương', action: 'Việc cần làm hoàn thành : HT BoM', time: '10 giờ trước', status: '', color: '#27AE60' },
        { user: 'Lê Ngọc Vân', action: 'Việc cần làm hoàn thành : HT BoM', time: '12 giờ trước', status: '', color: '#C0392B' }
    ];

    suggestions: any[] = [];
    showSuggestions = false;
    private searchSubject = new Subject<string>();
    private searchSub?: Subscription;

    constructor(private api: ApiService, private cdr: ChangeDetectorRef, private zone: NgZone) {
        window.onclick = () => { this.showSuggestions = false; this.cdr.detectChanges(); };
    }

    ngOnInit() {
        this.loadOrders();
        this.searchSub = this.searchSubject.pipe(
            debounceTime(200),
            switchMap((q: string) => q.trim() ? this.api.searchCustomers(q.trim()) : this.api.getCustomers())
        ).subscribe({ next: (res) => { this.suggestions = (res.data || []).slice(0, 10); this.showSuggestions = true; this.cdr.detectChanges(); } });
    }
    ngOnDestroy() { this.searchSub?.unsubscribe(); }

    resetOrder() {
        return { 
            orderCode: '', 
            customer: '', 
            customerId: null, 
            productCode: '', 
            productName: '',
            plannedQty: 0, 
            deliveredQty: 0,
            dueDate: '', 
            status: 'QUOTATION', 
            salesPerson: 'Lê Thị Hoài Linh', 
            notes: '',
            unitPrice: 200, 
            costPrice: 157.81,
            taxRate: 8,
            level: 3,
            isSample: false,
            sampleNote: '',
            totalCost: 0,
            confirmedAt: new Date().toISOString()
        };
    }

    loadOrders() {
        this.isLoading = true;
        this.api.getOrdersByDepartment('sales').subscribe({
            next: (res) => { this.zone.run(() => { this.orders = res.data || []; this.isLoading = false; this.cdr.detectChanges(); }); },
            error: () => this.isLoading = false
        });
    }

    openCreateForm() { this.currentOrder = this.resetOrder(); this.viewMode = 'form'; this.detailTab = 'lines'; }
    viewOrder(order: any) { this.currentOrder = { ...order }; this.viewMode = 'form'; this.detailTab = 'lines'; }

    saveOrder() {
        const req = this.currentOrder.id
            ? this.api.updateOrder(this.currentOrder.id, this.currentOrder)
            : this.api.createOrder(this.currentOrder);
        req.subscribe({ next: () => { this.viewMode = 'list'; this.loadOrders(); }, error: (err: any) => alert(err.error?.message || 'Lỗi') });
    }

    confirmOrder() {}
    searchCustomerSuggestions(v: string) { this.searchSubject.next(v || ''); }
    onCustomerFocus() { this.searchSubject.next(this.currentOrder.customer || ''); }
    selectCustomer(c: any) { this.currentOrder.customer = c.name; this.currentOrder.customerId = c.id; this.showSuggestions = false; this.cdr.detectChanges(); }

    getStatusClass(status: string): string {
        if (status === 'COMPLETED') return 'st-green';
        if (status === 'SALES_ORDER' || status === 'PRODUCTION') return 'st-blue';
        if (status === 'CONFIRMED') return 'st-orange';
        return 'st-gray';
    }

    getSubtotal(): number { return (this.currentOrder.plannedQty || 0) * (this.currentOrder.unitPrice || 0); }
    getTax(): number { return this.getSubtotal() * (this.currentOrder.taxRate || 0) / 100; }
    getTotal(): number { return this.getSubtotal() + this.getTax(); }

    getMargin(): number { return this.getTotal() - (this.currentOrder.costPrice * this.currentOrder.plannedQty); }
    getMarginPercent(): number {
        const total = this.getTotal();
        return total ? (this.getMargin() / total) * 100 : 0;
    }

    formatVND(n: number): string { return n.toLocaleString('vi-VN') + ' ₫'; }

    getStatusIndex(status: string): number { return STATUSES.indexOf(status); }
}
