import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductsService, Product, OperationTemplate } from '../../../core/services/products.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="products-container">
      <div class="header">
        <h1>Danh mục sản phẩm & Quy trình</h1>
        <button class="btn-primary" (click)="openModal()">
          <span class="plus-icon">+</span> Thêm sản phẩm
        </button>
      </div>

      <div class="products-grid">
        <div class="product-card" *ngFor="let product of products()">
          <div class="product-header">
            <div class="product-info">
              <h3>{{ product.name }}</h3>
              <code class="code-badge">{{ product.code }}</code>
            </div>
            <div class="product-actions">
              <button class="btn-icon" (click)="openModal(product); $event.stopPropagation()">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </button>
              <button class="btn-icon delete" (click)="deleteProduct(product); $event.stopPropagation()">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
            </div>
          </div>
          
          <p class="description">{{ product.description || 'Không có mô tả' }}</p>

          <div class="template-section">
            <span class="section-title">Quy trình sản xuất:</span>
            <div class="steps-flow">
              <div class="step" *ngFor="let step of product.templates">
                <span class="step-num">{{ step.sequence }}</span>
                <span class="step-name">{{ step.name }}</span>
                <span class="flow-arrow" *ngIf="!isLast(step, product)">→</span>
              </div>
              <div class="no-steps" *ngIf="!product.templates?.length">Chưa thiết lập quy trình</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Product Modal -->
      <div class="modal-overlay" *ngIf="showModal()">
        <div class="modal large">
          <div class="modal-header">
            <h2>{{ isEdit() ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới' }}</h2>
            <button class="close-btn" (click)="closeModal()">&times;</button>
          </div>
          <form (submit)="saveProduct($event)">
            <div class="modal-body">
              <div class="form-section">
                <h3>Thông tin cơ bản</h3>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Mã sản phẩm</label>
                    <input type="text" name="code" [(ngModel)]="formData.code" required placeholder="Ví dụ: HOP-IV-300">
                  </div>
                  <div class="form-group">
                    <label>Tên sản phẩm</label>
                    <input type="text" name="name" [(ngModel)]="formData.name" required placeholder="Nhập tên sản phẩm">
                  </div>
                  <div class="form-group full-width">
                    <label>Mô tả chi tiết</label>
                    <textarea name="description" [(ngModel)]="formData.description" rows="2" placeholder="Thông số kỹ thuật..."></textarea>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="section-header">
                  <h3>Quy trình sản xuất (Từng bước)</h3>
                  <button type="button" class="btn-text" (click)="addStep()">+ Thêm bước</button>
                </div>
                
                <div class="steps-list">
                  <div class="step-item" *ngFor="let step of formData.templates; let i = index">
                    <span class="step-index">#{{ i + 1 }}</span>
                    <input type="text" [name]="'stepName' + i" [(ngModel)]="step.name" required placeholder="Tên công đoạn">
                    <button type="button" class="btn-icon delete" (click)="removeStep(i)">
                      <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                  </div>
                  <div class="empty-steps" *ngIf="!formData.templates.length">
                    Chưa có bước nào. Hãy thêm bước đầu tiên (ví dụ: In, Cán, Bế...)
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeModal()">Hủy</button>
              <button type="submit" class="btn-primary" [disabled]="loading()">
                {{ loading() ? 'Đang lưu...' : (isEdit() ? 'Cập nhật' : 'Tạo mới') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Confirm Modal -->
      <div class="modal-overlay confirm-overlay" *ngIf="showConfirm()">
        <div class="modal confirm-modal">
          <div class="modal-body centered">
            <div class="warning-icon">⚠️</div>
            <h3>Xác nhận xóa</h3>
            <p>{{ confirmMessage() }}</p>
          </div>
          <div class="modal-footer centered">
            <button class="btn-secondary" (click)="closeConfirm()">Hủy</button>
            <button class="btn-primary" (click)="executeConfirm()">Đồng ý</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .products-container { padding: 2rem; max-width: 1200px; margin: 0 auto; animation: fadeIn 0.3s ease; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    .header h1 { font-size: 1.875rem; font-weight: 700; color: #fff; }

    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem; }
    .product-card { background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; padding: 1.5rem; backdrop-filter: blur(10px); transition: transform 0.2s; }
    .product-card:hover { transform: translateY(-4px); border-color: rgba(239,68,68,0.3); }

    .product-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
    .product-info h3 { margin: 0 0 0.5rem 0; color: #fff; font-size: 1.125rem; }
    .code-badge { background: rgba(255,255,255,0.05); color: #94a3b8; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; }
    
    .description { color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem; line-height: 1.5; }

    .template-section { background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 0.75rem; }
    .section-title { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 0.75rem; }
    .steps-flow { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .step { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8125rem; }
    .step-num { width: 18px; height: 18px; background: #ef4444; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.625rem; font-weight: 700; }
    .step-name { color: #e2e8f0; }
    .flow-arrow { color: #475569; }
    .no-steps { color: #475569; font-style: italic; font-size: 0.8125rem; }

    .product-actions { display: flex; gap: 0.25rem; }
    .btn-icon { background: none; border: none; padding: 0.4rem; color: #94a3b8; cursor: pointer; border-radius: 0.375rem; transition: all 0.2s; }
    .btn-icon:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .btn-icon.delete:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

    /* Modal Styles */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .modal { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; width: 100%; max-width: 700px; max-height: 90vh; display: flex; flex-direction: column; }
    .modal-header { padding: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
    .modal-header h2 { margin: 0; font-size: 1.25rem; color: #fff; }
    .modal-body { padding: 1.5rem; overflow-y: auto; }
    .close-btn { background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; }

    .form-section { margin-bottom: 2rem; }
    .form-section h3 { font-size: 0.875rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .section-header h3 { margin: 0; border: none; padding: 0; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .full-width { grid-column: span 2; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-group label { font-size: 0.875rem; color: #94a3b8; }
    .form-group input, .form-group textarea { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; padding: 0.625rem; color: #fff; width: 100%; }
    .form-group input:focus, .form-group textarea:focus { border-color: #ef4444; outline: none; }

    .steps-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .step-item { display: flex; align-items: center; gap: 1rem; background: rgba(0,0,0,0.2); padding: 0.5rem 1rem; border-radius: 0.5rem; }
    .step-index { font-weight: 700; color: #ef4444; width: 30px; }
    .step-item input { flex: 1; background: transparent; border: none; color: #fff; padding: 0.5rem 0; border-bottom: 1px solid transparent; }
    .step-item input:focus { border-bottom-color: #ef4444; outline: none; }
    .empty-steps { text-align: center; color: #475569; padding: 2rem; border: 2px dashed rgba(255,255,255,0.05); border-radius: 0.5rem; }

    .btn-text { background: none; border: none; color: #ef4444; font-weight: 600; cursor: pointer; padding: 0; font-size: 0.875rem; }
    .modal-footer { padding: 1.5rem; display: flex; justify-content: flex-end; gap: 1rem; border-top: 1px solid rgba(255,255,255,0.05); }
    
    /* Confirm Modal Specific */
    .confirm-overlay { z-index: 1100; }
    .confirm-modal { max-width: 400px; text-align: center; }
    .centered { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; }
    .warning-icon { font-size: 3rem; margin-bottom: 1rem; }
    .confirm-modal h3 { margin-bottom: 0.5rem; font-size: 1.25rem; color: #fff; }
    .confirm-modal p { color: #94a3b8; font-size: 0.875rem; margin-bottom: 0px; }
    .modal-footer.centered { border: none; padding-top: 0; }

    .btn-primary { background: #ef4444; color: white; border: none; padding: 0.625rem 1.25rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 0.625rem 1.25rem; border-radius: 0.5rem; cursor: pointer; }
    
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ProductsComponent implements OnInit {
  private productsService = inject(ProductsService);

  products = signal<Product[]>([]);
  loading = signal(false);
  showModal = signal(false);
  isEdit = signal(false);

  // Confirm Modal State
  showConfirm = signal(false);
  confirmMessage = signal('');
  confirmCallback: (() => void) | null = null;

  formData = {
    id: 0,
    code: '',
    name: '',
    description: '',
    templates: [] as OperationTemplate[]
  };

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.productsService.getProducts().subscribe(res => {
      this.products.set(res.data || []);
    });
  }

  isLast(step: OperationTemplate, product: Product) {
    return product.templates && step === product.templates[product.templates.length - 1];
  }

  openModal(product?: Product) {
    if (product) {
      this.isEdit.set(true);
      this.formData = {
        id: product.id,
        code: product.code,
        name: product.name,
        description: product.description || '',
        templates: product.templates ? product.templates.map(t => ({ ...t })) : []
      };
    } else {
      this.isEdit.set(false);
      this.formData = { id: 0, code: '', name: '', description: '', templates: [] };
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  addStep() {
    const nextSequence = this.formData.templates.length + 1;
    this.formData.templates.push({ name: '', sequence: nextSequence });
  }

  removeStep(index: number) {
    this.formData.templates.splice(index, 1);
    // Re-sequence
    this.formData.templates.forEach((step, i) => step.sequence = i + 1);
  }

  saveProduct(event: Event) {
    event.preventDefault();
    this.loading.set(true);

    if (this.isEdit()) {
      const { id, ...data } = this.formData;
      this.productsService.updateProduct(id, data).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    } else {
      const { id, ...data } = this.formData;
      this.productsService.createProduct(data).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    }
  }

  deleteProduct(product: Product) {
    this.confirmMessage.set(`Bạn có chắc muốn xóa sản phẩm "${product.name}"? Thao tác này không thể hoàn tác.`);
    this.confirmCallback = () => {
      this.productsService.deleteProduct(product.id).subscribe(() => {
        this.loadData();
        this.closeConfirm();
      });
    };
    this.showConfirm.set(true);
  }

  closeConfirm() {
    this.showConfirm.set(false);
    this.confirmCallback = null;
  }

  executeConfirm() {
    if (this.confirmCallback) {
      this.confirmCallback();
    }
  }
}
