import { Component } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-toast',
    standalone: true,
    template: `
    <div class="toast-container">
      @for (toast of toastService.items(); track toast.id) {
        <div class="toast toast-{{ toast.type }}" (click)="toastService.dismiss(toast.id)">
          {{ toast.message }}
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
    constructor(public toastService: ToastService) { }
}
