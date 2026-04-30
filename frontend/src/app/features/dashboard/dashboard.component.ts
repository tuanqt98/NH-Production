import { Component, OnInit, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, ApiResponse } from '../../core/services/api.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Tổng quan sản xuất hôm nay</p>
        </div>
        <button class="btn btn-secondary btn-sm" (click)="refreshData()">
          🔄 Làm mới
        </button>
      </div>

      <!-- Stat Cards -->
      <div class="grid-4" style="margin-bottom: 24px;">
        <div class="stat-card animate-fade-in">
          <div class="stat-icon" style="background: rgba(79,195,247,0.15); color: var(--status-info);">📋</div>
          <div class="stat-info">
            <span class="stat-value">{{ summary()?.totalOrders || 0 }}</span>
            <span class="stat-label">Tổng lệnh SX</span>
          </div>
        </div>
        <div class="stat-card animate-fade-in" style="animation-delay: 100ms">
          <div class="stat-icon" style="background: rgba(70,211,105,0.15); color: var(--status-success);">✅</div>
          <div class="stat-info">
            <span class="stat-value">{{ summary()?.completedOrders || 0 }}</span>
            <span class="stat-label">Hoàn thành</span>
          </div>
        </div>
        <div class="stat-card animate-fade-in" style="animation-delay: 200ms">
          <div class="stat-icon" style="background: rgba(245,166,35,0.15); color: var(--status-warning);">⏳</div>
          <div class="stat-info">
            <span class="stat-value">{{ summary()?.inProgressOrders || 0 }}</span>
            <span class="stat-label">Đang sản xuất</span>
          </div>
        </div>
        <div class="stat-card animate-fade-in" style="animation-delay: 300ms">
          <div class="stat-icon" style="background: rgba(229,9,20,0.15); color: var(--status-error);">⚠️</div>
          <div class="stat-info">
            <span class="stat-value">{{ summary()?.overdueOrders || 0 }}</span>
            <span class="stat-label">Trễ hạn</span>
          </div>
        </div>
      </div>

      <!-- Production Stats Row -->
      <div class="grid-3" style="margin-bottom: 24px;">
        <div class="stat-card-mini">
          <span class="mini-label">Sản lượng OK hôm nay</span>
          <span class="mini-value text-success">{{ summary()?.todayOkQty || 0 }}</span>
        </div>
        <div class="stat-card-mini">
          <span class="mini-label">Sản lượng NG hôm nay</span>
          <span class="mini-value text-error">{{ summary()?.todayNgQty || 0 }}</span>
        </div>
        <div class="stat-card-mini">
          <span class="mini-label">Tỷ lệ NG</span>
          <span class="mini-value text-warning">{{ summary()?.ngRate || '0.00' }}%</span>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid-2" style="margin-bottom: 24px;">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Sản lượng theo ngày (30 ngày)</h3>
          </div>
          <div class="chart-wrapper">
            <canvas #dailyChart></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Tỷ lệ NG theo công đoạn</h3>
          </div>
          <div class="chart-wrapper">
            <canvas #ngChart></canvas>
          </div>
        </div>
      </div>

      <!-- Overdue Orders -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🚨 Lệnh trễ hạn</h3>
        </div>
        @if (overdueOrders().length === 0) {
          <p class="empty-text">Không có lệnh trễ hạn 🎉</p>
        } @else {
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Mã lệnh</th>
                  <th>Khách hàng</th>
                  <th>SL kế hoạch</th>
                  <th>Ngày giao</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (order of overdueOrders(); track order.id) {
                  <tr>
                    <td><strong>{{ order.orderCode }}</strong></td>
                    <td>{{ order.customer }}</td>
                    <td>{{ order.plannedQty | number }}</td>
                    <td class="text-error">{{ order.dueDate | date:'dd/MM/yyyy' }}</td>
                    <td><span class="badge badge-error">{{ order.status }}</span></td>
                    <td><a [routerLink]="['/orders', order.id]" class="btn btn-ghost btn-sm">Xem →</a></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all var(--transition-normal);
    }
    .stat-card:hover {
      border-color: var(--border-light);
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    .stat-icon {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }
    .stat-info {
      display: flex;
      flex-direction: column;
    }
    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-bright);
      line-height: 1.2;
    }
    .stat-label {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .stat-card-mini {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .mini-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .mini-value {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .text-success { color: var(--status-success); }
    .text-error { color: var(--status-error); }
    .text-warning { color: var(--status-warning); }

    .chart-wrapper {
      position: relative;
      height: 280px;
    }

    .empty-text {
      text-align: center;
      color: var(--text-secondary);
      padding: 32px;
      font-size: 0.95rem;
    }
  `],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('dailyChart') dailyChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ngChart') ngChartRef!: ElementRef<HTMLCanvasElement>;

  summary = signal<any>(null);
  overdueOrders = signal<any[]>([]);
  private dailyChart: Chart | null = null;
  private ngChart: Chart | null = null;

  constructor(private api: ApiService) { }

  ngOnInit(): void {
    this.refreshData();
  }

  ngAfterViewInit(): void {
    this.loadCharts();
  }

  refreshData(): void {
    this.api.getDashboardSummary().subscribe((res: ApiResponse) => {
      if (res.success) this.summary.set(res.data);
    });

    this.api.getOverdueOrders().subscribe((res: ApiResponse) => {
      if (res.success) this.overdueOrders.set(res.data || []);
    });
  }

  loadCharts(): void {
    // Daily output chart
    this.api.getDailyOutput(30).subscribe((res: ApiResponse) => {
      if (res.success && res.data) {
        this.renderDailyChart(res.data);
      }
    });

    // NG rate chart
    this.api.getNgRate().subscribe((res: ApiResponse) => {
      if (res.success && res.data) {
        this.renderNgChart(res.data);
      }
    });
  }

  private renderDailyChart(data: any[]): void {
    if (this.dailyChart) this.dailyChart.destroy();

    const ctx = this.dailyChartRef?.nativeElement;
    if (!ctx) return;

    this.dailyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.date.substring(5)), // MM-DD
        datasets: [
          {
            label: 'OK',
            data: data.map(d => d.okQty),
            backgroundColor: 'rgba(70,211,105,0.7)',
            borderRadius: 4,
          },
          {
            label: 'NG',
            data: data.map(d => d.ngQty),
            backgroundColor: 'rgba(229,9,20,0.7)',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#999' } },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#666', maxTicksLimit: 15 },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#666' },
          },
        },
      },
    });
  }

  private renderNgChart(data: any[]): void {
    if (this.ngChart) this.ngChart.destroy();

    const ctx = this.ngChartRef?.nativeElement;
    if (!ctx) return;

    const colors = ['#e50914', '#f5a623', '#4fc3f7', '#46d369'];

    this.ngChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.operationName),
        datasets: [{
          data: data.map(d => parseFloat(d.ngRate)),
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#999', padding: 16 },
          },
        },
        cutout: '60%',
      },
    });
  }
}
