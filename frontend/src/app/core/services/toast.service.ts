import { Injectable, signal } from '@angular/core';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
    private toasts = signal<Toast[]>([]);
    private nextId = 0;

    items = this.toasts.asReadonly();

    show(message: string, type: Toast['type'] = 'info', duration = 4000): void {
        const id = ++this.nextId;
        this.toasts.update(list => [...list, { id, message, type }]);
        setTimeout(() => this.dismiss(id), duration);
    }

    success(message: string): void { this.show(message, 'success'); }
    error(message: string): void { this.show(message, 'error', 6000); }
    warning(message: string): void { this.show(message, 'warning'); }
    info(message: string): void { this.show(message, 'info'); }

    dismiss(id: number): void {
        this.toasts.update(list => list.filter(t => t.id !== id));
    }
}
