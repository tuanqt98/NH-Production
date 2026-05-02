import { Component, OnInit, ChangeDetectorRef, NgZone, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

type ViewMode = 'list' | 'form';

@Component({
    selector: 'app-customers',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="premium-view">
        <!-- ACTION BAR -->
        <div class="action-bar" *ngIf="viewMode === 'list'">
            <div class="bar-left">
                <button class="btn-premium" (click)="openCreateForm()">
                    <span>+</span> Create Customer
                </button>
                <button class="btn-ghost" (click)="triggerImport()">
                    📥 Import Excel
                </button>
                <button class="btn-danger-ghost" *ngIf="selectedIds.size > 0" (click)="deleteSelected()">
                    🗑️ Delete ({{selectedIds.size}})
                </button>
            </div>
            <div class="bar-right">
                <div class="search-input-wrapper">
                    <span class="search-icon">🔍</span>
                    <input type="text" placeholder="Search customers..." [(ngModel)]="searchQuery" (input)="onSearch()">
                </div>
            </div>
        </div>

        <!-- LIST GRID -->
        <div class="list-container" *ngIf="viewMode === 'list'">
            <div class="selection-header" *ngIf="customers.length > 0">
                <label class="custom-checkbox">
                    <input type="checkbox" (change)="toggleSelectAll($event)" [checked]="isAllSelected()">
                    <span class="checkmark"></span> Select All
                </label>
            </div>
            
            <div class="customer-grid" *ngIf="!isLoading">
                <div *ngFor="let c of customers" class="customer-card-premium" [class.selected]="selectedIds.has(c.id)" (click)="viewCustomer(c)">
                    <div class="card-header">
                        <label class="custom-checkbox" (click)="$event.stopPropagation()">
                            <input type="checkbox" [checked]="selectedIds.has(c.id)" (change)="toggleSelect(c.id)">
                            <span class="checkmark"></span>
                        </label>
                        <span class="customer-type" [class.company]="c.isCompany">{{c.isCompany ? 'Company' : 'Individual'}}</span>
                    </div>
                    
                    <div class="card-body">
                        <div class="avatar-wrapper">
                            <img [src]="'https://ui-avatars.com/api/?name=' + c.name + '&background=6366f1&color=fff&bold=true'" alt="avatar">
                        </div>
                        <div class="info-wrapper">
                            <h3 class="customer-name">{{c.name}}</h3>
                            <div class="customer-kd" *ngIf="c.salesPerson">
                                <span class="dot"></span> {{c.salesPerson}}
                            </div>
                        </div>
                    </div>

                    <div class="card-footer">
                        <div class="footer-item">
                            <span class="icon">📞</span> {{c.phone || '--'}}
                        </div>
                        <div class="footer-item">
                            <span class="icon">📍</span> {{c.address || '--'}}
                        </div>
                    </div>
                </div>
            </div>
            <div class="loading-overlay" *ngIf="isLoading">
                <div class="spinner"></div>
            </div>
        </div>

        <!-- FORM VIEW -->
        <div class="form-container" *ngIf="viewMode === 'form'">
            <div class="form-header">
                <div class="header-left">
                    <button class="btn-icon-only" (click)="viewMode = 'list'">←</button>
                    <h2>{{currentCustomer.id ? 'Edit Customer' : 'New Customer'}}</h2>
                </div>
                <div class="header-actions">
                    <button class="btn-ghost" (click)="viewMode = 'list'">Cancel</button>
                    <button class="btn-danger-ghost" *ngIf="currentCustomer.id" (click)="deleteCustomer(currentCustomer.id)">Delete</button>
                    <button class="btn-premium" (click)="saveCustomer()">Save Changes</button>
                </div>
            </div>

            <div class="form-body">
                <div class="form-card card-premium">
                    <div class="form-section-title">Identity</div>
                    <div class="identity-header">
                        <div class="avatar-large">
                            <img [src]="'https://ui-avatars.com/api/?name=' + currentCustomer.name + '&background=6366f1&color=fff&size=128'" alt="avatar">
                        </div>
                        <div class="identity-inputs">
                            <div class="type-toggle">
                                <button [class.active]="!currentCustomer.isCompany" (click)="currentCustomer.isCompany = false">Individual</button>
                                <button [class.active]="currentCustomer.isCompany" (click)="currentCustomer.isCompany = true">Company</button>
                            </div>
                            <input type="text" class="input-hero" [(ngModel)]="currentCustomer.name" placeholder="Full Name or Company Name">
                        </div>
                    </div>

                    <div class="form-grid-modern">
                        <div class="input-group">
                            <label>Customer Code</label>
                            <input type="text" [(ngModel)]="currentCustomer.code" readonly placeholder="Auto-generated">
                        </div>
                        <div class="input-group">
                            <label>Tax Identification</label>
                            <input type="text" [(ngModel)]="currentCustomer.taxCode" placeholder="VAT / Tax Number">
                        </div>
                        <div class="input-group">
                            <label>Email Address</label>
                            <input type="email" [(ngModel)]="currentCustomer.email" placeholder="email@example.com">
                        </div>
                        <div class="input-group">
                            <label>Phone Number</label>
                            <input type="text" [(ngModel)]="currentCustomer.phone" placeholder="+84 ...">
                        </div>
                        <div class="input-group">
                            <label>Sales Representative</label>
                            <input type="text" [(ngModel)]="currentCustomer.salesPerson" placeholder="Assigned salesperson">
                        </div>
                        <div class="input-group">
                            <label>Website</label>
                            <input type="text" [(ngModel)]="currentCustomer.website" placeholder="https://...">
                        </div>
                    </div>

                    <div class="input-group full">
                        <label>Physical Address</label>
                        <input type="text" [(ngModel)]="currentCustomer.address" placeholder="Street, District, City...">
                    </div>

                    <div class="input-group full">
                        <label>Internal Notes</label>
                        <textarea [(ngModel)]="currentCustomer.notes" rows="4" placeholder="Any additional information..."></textarea>
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
    .bar-left { display: flex; gap: 14px; }
    
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

    .btn-danger-ghost { 
        background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);
        padding: 12px 24px; border-radius: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s;
    }
    .btn-danger-ghost:hover { background: rgba(239, 68, 68, 0.2); transform: scale(1.02); }

    .search-input-wrapper { position: relative; }
    .search-icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 18px; }
    .search-input-wrapper input { 
        padding: 14px 20px 14px 52px; border-radius: 16px; border: 1.5px solid rgba(255,255,255,0.1);
        width: 360px; outline: none; transition: all 0.3s; background: rgba(0,0,0,0.2); color: #fff;
    }
    .search-input-wrapper input:focus { border-color: var(--primary); background: rgba(0,0,0,0.3); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }

    /* Grid - High Intensity */
    .selection-header { margin-bottom: 24px; display: flex; align-items: center; justify-content: flex-end; }
    .customer-grid { 
        display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); 
        gap: 32px; 
    }
    .customer-card-premium { 
        background: rgba(255,255,255,0.02); backdrop-filter: blur(30px); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 32px; padding: 32px; cursor: pointer; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        position: relative; overflow: hidden;
    }
    .customer-card-premium:hover { transform: translateY(-8px) scale(1.02); box-shadow: 0 30px 60px rgba(0,0,0,0.4); border-color: var(--primary); }
    .customer-card-premium.selected { background: rgba(99, 102, 241, 0.1); border-color: var(--primary); }

    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
    .customer-type { font-size: 10px; font-weight: 900; text-transform: uppercase; padding: 5px 12px; border-radius: 20px; background: rgba(255,255,255,0.05); color: #94a3b8; letter-spacing: 1px; }
    .customer-type.company { background: rgba(16, 185, 129, 0.15); color: #10b981; }

    .card-body { display: flex; align-items: center; gap: 20px; margin-bottom: 28px; }
    .avatar-wrapper img { width: 68px; height: 68px; border-radius: 22px; object-fit: cover; border: 2px solid rgba(255,255,255,0.1); }
    .customer-name { font-family: 'Outfit'; font-size: 22px; font-weight: 800; color: #fff; margin: 0; letter-spacing: -0.5px; }
    .customer-kd { font-size: 13px; color: var(--primary); font-weight: 700; display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .dot { width: 6px; height: 6px; background: var(--primary); border-radius: 50%; box-shadow: 0 0 8px var(--primary); }

    .card-footer { border-top: 1px solid rgba(255,255,255,0.05); padding-top: 24px; display: grid; gap: 12px; }
    .footer-item { font-size: 14px; color: var(--text-muted); display: flex; align-items: center; gap: 10px; font-weight: 500; }
    .footer-item .icon { font-size: 16px; opacity: 0.8; }

    /* Checkbox - Sharp */
    .custom-checkbox { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; font-weight: 700; color: var(--text-muted); transition: color 0.2s; }
    .custom-checkbox:hover { color: #fff; }
    .custom-checkbox input { display: none; }
    .checkmark { width: 22px; height: 22px; border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; position: relative; transition: all 0.3s; background: rgba(0,0,0,0.2); }
    .custom-checkbox input:checked + .checkmark { background: var(--primary); border-color: var(--primary); box-shadow: 0 0 10px rgba(99, 102, 241, 0.4); }
    .checkmark:after { content: "✓"; position: absolute; color: #fff; font-size: 16px; left: 4px; top: -1px; display: none; }
    .custom-checkbox input:checked + .checkmark:after { display: block; }

    /* Form - Luxury */
    .form-container { max-width: 1000px; margin: 0 auto; padding-top: 20px; }
    .form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 48px; }
    .header-left { display: flex; align-items: center; gap: 20px; }
    .header-left h2 { font-family: 'Outfit'; font-size: 32px; font-weight: 800; color: #fff; }
    .btn-icon-only { width: 52px; height: 52px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff; cursor: pointer; font-size: 20px; transition: all 0.2s; }
    .btn-icon-only:hover { background: rgba(255,255,255,0.1); transform: translateX(-4px); }
    
    .form-card { padding: 56px; background: rgba(255,255,255,0.02); backdrop-filter: blur(40px); border: 1px solid rgba(255,255,255,0.06); border-radius: 40px; }
    .form-section-title { font-family: 'Outfit'; font-size: 12px; font-weight: 900; text-transform: uppercase; color: var(--primary); letter-spacing: 2.5px; margin-bottom: 40px; opacity: 0.8; }
    
    .identity-header { display: flex; gap: 48px; margin-bottom: 56px; }
    .avatar-large img { width: 128px; height: 128px; border-radius: 32px; border: 4px solid rgba(255,255,255,0.05); box-shadow: var(--shadow-xl); }
    .identity-inputs { flex: 1; }
    .type-toggle { display: flex; background: rgba(0,0,0,0.2); padding: 6px; border-radius: 16px; width: fit-content; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.05); }
    .type-toggle button { border: none; padding: 8px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; background: transparent; color: #94a3b8; transition: all 0.2s; }
    .type-toggle button.active { background: #fff; color: #000; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .input-hero { width: 100%; border: none; border-bottom: 3px solid rgba(255,255,255,0.1); font-size: 36px; font-weight: 800; outline: none; padding: 12px 0; background: transparent; color: #fff; font-family: 'Outfit'; }
    .input-hero:focus { border-color: var(--primary); }

    .form-grid-modern { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
    .input-group { display: flex; flex-direction: column; gap: 10px; }
    .input-group.full { grid-column: 1 / -1; margin-bottom: 20px; }
    .input-group label { font-size: 13px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; padding-left: 4px; }
    .input-group input, .input-group textarea { 
        padding: 16px 20px; border-radius: 20px; border: 1.5px solid rgba(255,255,255,0.08);
        font-size: 15px; outline: none; transition: all 0.3s; background: rgba(0,0,0,0.2); color: #fff; font-weight: 500;
    }
    .input-group input:focus, .input-group textarea:focus { border-color: var(--primary); background: rgba(0,0,0,0.3); box-shadow: 0 0 0 5px rgba(99, 102, 241, 0.1); }
    
    .loading-overlay { padding: 100px; text-align: center; }
    .spinner { width: 56px; height: 56px; border: 5px solid rgba(255,255,255,0.1); border-top: 5px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; filter: drop-shadow(0 0 10px var(--primary)); }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  `]
})
export class CustomersComponent implements OnInit {
    viewMode: ViewMode = 'list';
    customers: any[] = [];
    currentCustomer: any = this.resetCustomer();
    isLoading = false;
    searchQuery = '';
    selectedIds = new Set<number>();

    constructor(
        private api: ApiService,
        private cdr: ChangeDetectorRef,
        private zone: NgZone
    ) {}

    @ViewChild('fileInput') fileInput!: any;

    triggerImport() {
        this.fileInput.nativeElement.click();
    }

    onFileSelected(event: any) {
        const file: File = event.target.files[0];
        if (file) {
            this.isLoading = true;
            this.api.importCustomers(file).subscribe({
                next: (res) => {
                    const result = res.data;
                    alert(`Import thành công!\n- Đã thêm: ${result.imported}\n- Bỏ qua: ${result.skipped}\n- Lỗi: ${result.errors.length}`);
                    this.loadCustomers();
                    event.target.value = ''; // Reset input
                },
                error: (err) => {
                    alert(err.error?.message || 'Lỗi khi import file');
                    this.isLoading = false;
                    event.target.value = ''; // Reset input
                }
            });
        }
    }

    ngOnInit() {
        console.log('CustomersComponent loaded');
        this.loadCustomers();
    }

    resetCustomer() {
        return {
            name: '',
            code: '',
            taxCode: '',
            phone: '',
            email: '',
            address: '',
            website: '',
            salesPerson: '',
            isCompany: true,
            notes: ''
        };
    }

    toggleSelect(id: number) {
        if (this.selectedIds.has(id)) this.selectedIds.delete(id);
        else this.selectedIds.add(id);
    }

    toggleSelectAll(event: any) {
        if (event.target.checked) {
            this.customers.forEach(c => this.selectedIds.add(c.id));
        } else {
            this.selectedIds.clear();
        }
    }

    isAllSelected() {
        return this.customers.length > 0 && this.selectedIds.size === this.customers.length;
    }

    deleteSelected() {
        if (!confirm(`Bạn có chắc chắn muốn xóa ${this.selectedIds.size} khách hàng đã chọn?`)) return;
        
        this.isLoading = true;
        this.api.bulkDeleteCustomers(Array.from(this.selectedIds)).subscribe({
            next: () => {
                this.selectedIds.clear();
                this.loadCustomers();
            },
            error: (err) => {
                alert(err.error?.message || 'Lỗi khi xóa hàng loạt');
                this.isLoading = false;
            }
        });
    }

    deleteCustomer(id: number) {
        if (!confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) return;
        
        this.api.deleteCustomer(id).subscribe({
            next: () => {
                this.viewMode = 'list';
                this.loadCustomers();
            },
            error: (err) => alert(err.error?.message || 'Lỗi khi xóa khách hàng')
        });
    }

    loadCustomers() {
        this.isLoading = true;
        this.api.getCustomers().subscribe({
            next: (res) => {
                this.zone.run(() => {
                    this.customers = res.data || [];
                    this.isLoading = false;
                    this.cdr.detectChanges();
                });
            },
            error: () => this.isLoading = false
        });
    }

    openCreateForm() {
        this.currentCustomer = this.resetCustomer();
        this.viewMode = 'form';
    }

    viewCustomer(customer: any) {
        this.currentCustomer = { ...customer };
        this.viewMode = 'form';
    }

    saveCustomer() {
        if (!this.currentCustomer.name) {
            alert('Vui lòng nhập tên khách hàng');
            return;
        }

        const request = this.currentCustomer.id 
            ? this.api.updateCustomer(this.currentCustomer.id, this.currentCustomer)
            : this.api.createCustomer(this.currentCustomer);

        request.subscribe({
            next: () => {
                this.viewMode = 'list';
                this.loadCustomers();
            },
            error: (err) => alert(err.error?.message || 'Lỗi lưu khách hàng')
        });
    }

    onSearch() {
        if (this.searchQuery.length > 1) {
            this.api.searchCustomers(this.searchQuery).subscribe(res => {
                this.customers = res.data || [];
            });
        } else if (this.searchQuery.length === 0) {
            this.loadCustomers();
        }
    }
}
