import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';

type ViewMode = 'list' | 'form';
const STATUSES = ['QUOTATION', 'PRICE_PROPOSAL', 'AWAITING_CONFIRM', 'CONFIRMED', 'SALES_ORDER', 'COMPLETED'];
const STATUS_LABELS: Record<string, string> = {
  'QUOTATION': 'Báo giá',
  'PRICE_PROPOSAL': 'Đề nghị duyệt giá',
  'AWAITING_CONFIRM': 'Chờ xác nhận',
  'CONFIRMED': 'Xác nhận đơn ĐH',
  'SALES_ORDER': 'Đơn bán hàng',
  'COMPLETED': 'Hoàn tất sản xuất'
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
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        return { 
            orderCode: 'S' + Math.floor(Math.random() * 100000), 
            customer: '', 
            customerId: null, 
            productCode: 'NEW-PROD', 
            productName: '',
            plannedQty: 1, 
            deliveredQty: 0,
            dueDate: nextWeek.toISOString().split('T')[0], 
            status: 'QUOTATION', 
            salesPerson: 'Lê Thị Hoài Linh', 
            notes: '',
            unitPrice: 0, 
            costPrice: 0,
            taxRate: 8,
            level: 3,
            isSample: false,
            sampleNote: '',
            totalCost: 0,
            confirmedAt: today.toISOString(),
            operations: [
                { name: 'In', sequence: 1 },
                { name: 'Bế', sequence: 2 },
                { name: 'Thành phẩm', sequence: 3 }
            ]
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
        if (!this.currentOrder.customer) { alert('Vui lòng chọn khách hàng'); return; }
        if (!this.currentOrder.orderCode) { alert('Vui lòng nhập mã đơn hàng'); return; }
        
        // Ensure numbers
        this.currentOrder.plannedQty = Number(this.currentOrder.plannedQty) || 1;
        this.currentOrder.unitPrice = Number(this.currentOrder.unitPrice) || 0;
        this.currentOrder.costPrice = Number(this.currentOrder.costPrice) || 0;

        const req = this.currentOrder.id
            ? this.api.updateOrder(this.currentOrder.id, this.currentOrder)
            : this.api.createOrder(this.currentOrder);
            
        this.isLoading = true;
        req.subscribe({ 
            next: (res) => { 
                console.log('Save success:', res);
                this.viewMode = 'list'; 
                this.loadOrders(); 
            }, 
            error: (err: any) => {
                this.isLoading = false;
                console.error('Save error:', err);
                alert('Lỗi: ' + (err.error?.message || 'Không thể lưu đơn hàng. Vui lòng kiểm tra lại dữ liệu.'));
            } 
        });
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
