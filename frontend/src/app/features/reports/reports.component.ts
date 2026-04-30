import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    ReportsService,
    ProductionSummary,
    WorkerProductivity,
    OrderCompletion,
    NgAnalysis,
    OEEData
} from '../../core/services/reports.service';

@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="reports-container">
      <div class="reports-header">
        <h1>📊 Báo cáo & Phân tích</h1>
        <p class="subtitle">Phân tích sản xuất, năng suất công nhân, chất lượng sản phẩm</p>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="filter-group">
          <label>Từ ngày</label>
          <input type="date" [(ngModel)]="startDate" (change)="loadData()">
        </div>
        <div class="filter-group">
          <label>Đến ngày</label>
          <input type="date" [(ngModel)]="endDate" (change)="loadData()">
        </div>
        <div class="filter-group">
          <label>Nhóm theo</label>
          <select [(ngModel)]="groupBy" (change)="loadProductionSummary()">
            <option value="day">Ngày</option>
            <option value="week">Tuần</option>
            <option value="month">Tháng</option>
          </select>
        </div>
        <div class="filter-actions">
          <button class="btn-primary" (click)="loadData()">🔄 Tải lại</button>
          <button class="btn-outline" (click)="exportExcel('production')">📥 Xuất Excel</button>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tabs">
        <button [class.active]="activeTab === 'summary'" (click)="activeTab = 'summary'">📈 Sản lượng</button>
        <button [class.active]="activeTab === 'workers'" (click)="activeTab = 'workers'">👷 Năng suất</button>
        <button [class.active]="activeTab === 'orders'" (click)="activeTab = 'orders'">📋 Đơn hàng</button>
        <button [class.active]="activeTab === 'ng'" (click)="activeTab = 'ng'">⚠️ Phân tích NG</button>
        <button [class.active]="activeTab === 'oee'" (click)="activeTab = 'oee'">🏭 OEE</button>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      }

      <!-- Tab: Sản lượng -->
      @if (activeTab === 'summary' && !loading()) {
        <div class="tab-content">
          <!-- Summary Cards -->
          <div class="summary-cards">
            <div class="stat-card green">
              <div class="stat-value">{{ getTotalOk() | number }}</div>
              <div class="stat-label">Tổng OK</div>
            </div>
            <div class="stat-card red">
              <div class="stat-value">{{ getTotalNg() | number }}</div>
              <div class="stat-label">Tổng NG</div>
            </div>
            <div class="stat-card blue">
              <div class="stat-value">{{ getTotalHours() }}</div>
              <div class="stat-label">Tổng giờ</div>
            </div>
            <div class="stat-card purple">
              <div class="stat-value">{{ getAvgProductivity() }}</div>
              <div class="stat-label">NS TB/giờ</div>
            </div>
          </div>

          <!-- Chart: Bar chart using CSS -->
          <div class="chart-section">
            <h3>Biểu đồ sản lượng theo {{ groupBy === 'day' ? 'ngày' : groupBy === 'week' ? 'tuần' : 'tháng' }}</h3>
            <div class="bar-chart">
              @for (item of productionData; track item.period) {
                <div class="bar-group" [title]="item.period + ': OK=' + item.okQty + ', NG=' + item.ngQty">
                  <div class="bar-label">{{ formatPeriod(item.period) }}</div>
                  <div class="bar-track">
                    <div class="bar ok" [style.width.%]="getBarWidth(item.okQty)"></div>
                    <div class="bar ng" [style.width.%]="getBarWidth(item.ngQty)"></div>
                  </div>
                  <div class="bar-value">{{ item.totalQty | number }}</div>
                </div>
              }
            </div>
            <div class="chart-legend">
              <span class="legend-item"><span class="dot green"></span> OK</span>
              <span class="legend-item"><span class="dot red"></span> NG</span>
            </div>
          </div>

          <!-- Data Table -->
          <div class="data-table-container">
            <div class="table-header-row">
              <h3>Chi tiết sản lượng</h3>
              <button class="btn-sm" (click)="exportExcel('production')">📥 Excel</button>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Kỳ</th>
                  <th>OK</th>
                  <th>NG</th>
                  <th>Tổng</th>
                  <th>Giờ</th>
                  <th>NS/giờ</th>
                  <th>Tỷ lệ NG</th>
                </tr>
              </thead>
              <tbody>
                @for (item of productionData; track item.period) {
                  <tr>
                    <td>{{ item.period }}</td>
                    <td class="text-green">{{ item.okQty | number }}</td>
                    <td class="text-red">{{ item.ngQty | number }}</td>
                    <td>{{ item.totalQty | number }}</td>
                    <td>{{ item.totalHours }}h</td>
                    <td>{{ item.productivity | number }}</td>
                    <td [class.text-red]="parseFloat(item.ngRate) > 1">{{ item.ngRate }}%</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Tab: Năng suất công nhân -->
      @if (activeTab === 'workers' && !loading()) {
        <div class="tab-content">
          <div class="table-header-row">
            <h3>Bảng xếp hạng năng suất công nhân</h3>
            <button class="btn-sm" (click)="exportExcel('workers')">📥 Excel</button>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Mã NV</th>
                <th>Họ tên</th>
                <th>OK</th>
                <th>NG</th>
                <th>Giờ làm</th>
                <th>NS/giờ</th>
                <th>Tỷ lệ NG</th>
                <th>Công đoạn</th>
              </tr>
            </thead>
            <tbody>
              @for (w of workerData; track w.userId; let i = $index) {
                <tr [class.top-performer]="i < 3">
                  <td>
                    @if (i === 0) { 🥇 }
                    @else if (i === 1) { 🥈 }
                    @else if (i === 2) { 🥉 }
                    @else { {{ i + 1 }} }
                  </td>
                  <td>{{ w.username }}</td>
                  <td>{{ w.fullName }}</td>
                  <td class="text-green">{{ w.okQty | number }}</td>
                  <td class="text-red">{{ w.ngQty | number }}</td>
                  <td>{{ w.totalHours }}h</td>
                  <td class="text-blue bold">{{ w.productivityPerHour | number }}</td>
                  <td [class.text-red]="parseFloat(w.ngRate) > 1">{{ w.ngRate }}%</td>
                  <td><span class="tag-list">{{ w.operations.join(', ') }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Tab: Đơn hàng -->
      @if (activeTab === 'orders' && !loading()) {
        <div class="tab-content">
          <div class="table-header-row">
            <h3>Tiến độ đơn hàng</h3>
            <button class="btn-sm" (click)="exportExcel('orders')">📥 Excel</button>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã LSX</th>
                <th>Sản phẩm</th>
                <th>Khách hàng</th>
                <th>KH</th>
                <th>Thực tế</th>
                <th>Tiến độ</th>
                <th>Công đoạn</th>
                <th>Hạn</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              @for (o of orderData; track o.orderCode) {
                <tr [class.overdue]="o.isOverdue">
                  <td>{{ o.orderCode }}</td>
                  <td>{{ o.productCode }}</td>
                  <td>{{ o.customer }}</td>
                  <td>{{ o.plannedQty | number }}</td>
                  <td class="text-green">{{ o.actualOk | number }}</td>
                  <td>
                    <div class="progress-cell">
                      <div class="progress-bar">
                        <div class="progress-fill" [style.width.%]="o.completionPercent"
                             [class.complete]="o.completionPercent >= 100"
                             [class.danger]="o.isOverdue"></div>
                      </div>
                      <span>{{ o.completionPercent }}%</span>
                    </div>
                  </td>
                  <td>{{ o.operationsCompleted }}/{{ o.operationsTotal }}</td>
                  <td [class.text-red]="o.isOverdue">{{ o.dueDate | date:'dd/MM/yyyy' }}</td>
                  <td>
                    <span class="status-badge" [class]="'status-' + o.status.toLowerCase()">
                      {{ getStatusLabel(o.status) }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Tab: Phân tích NG -->
      @if (activeTab === 'ng' && !loading()) {
        <div class="tab-content">
          <div class="ng-grid">
            <!-- NG by Operation -->
            <div class="ng-section">
              <h3>NG theo công đoạn</h3>
              <table class="data-table">
                <thead>
                  <tr><th>Công đoạn</th><th>OK</th><th>NG</th><th>Tỷ lệ NG</th></tr>
                </thead>
                <tbody>
                  @for (item of ngData?.byOperation || []; track item.operationName) {
                    <tr>
                      <td>{{ item.operationName }}</td>
                      <td class="text-green">{{ item.okQty | number }}</td>
                      <td class="text-red">{{ item.ngQty | number }}</td>
                      <td [class.text-red]="parseFloat(item.ngRate) > 1">{{ item.ngRate }}%</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- NG by Product -->
            <div class="ng-section">
              <h3>NG theo sản phẩm</h3>
              <table class="data-table">
                <thead>
                  <tr><th>Sản phẩm</th><th>OK</th><th>NG</th><th>Tỷ lệ NG</th></tr>
                </thead>
                <tbody>
                  @for (item of ngData?.byProduct || []; track item.productCode) {
                    <tr>
                      <td>{{ item.productCode }}</td>
                      <td class="text-green">{{ item.okQty | number }}</td>
                      <td class="text-red">{{ item.ngQty | number }}</td>
                      <td [class.text-red]="parseFloat(item.ngRate) > 1">{{ item.ngRate }}%</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- NG by Reason -->
            <div class="ng-section full-width">
              <h3>NG theo lý do</h3>
              @if ((ngData?.byReason || []).length === 0) {
                <p class="empty-msg">Chưa có dữ liệu lý do NG trong khoảng thời gian này</p>
              } @else {
                <div class="reason-bars">
                  @for (r of ngData?.byReason || []; track r.reason) {
                    <div class="reason-item">
                      <span class="reason-label">{{ r.reason }}</span>
                      <div class="reason-bar-track">
                        <div class="reason-bar" [style.width.%]="getReasonBarWidth(r.totalQty)"></div>
                      </div>
                      <span class="reason-value">{{ r.totalQty | number }} ({{ r.count }} lần)</span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Tab: OEE -->
      @if (activeTab === 'oee' && !loading()) {
        <div class="tab-content">
          <div class="oee-grid">
            <div class="oee-gauge" [class.good]="(oeeData?.oee || 0) >= 85" [class.warning]="(oeeData?.oee || 0) >= 60 && (oeeData?.oee || 0) < 85" [class.danger]="(oeeData?.oee || 0) < 60">
              <div class="gauge-circle">
                <svg viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8"/>
                  <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" stroke-width="8"
                          stroke-dasharray="339.3" [attr.stroke-dashoffset]="339.3 - (339.3 * (oeeData?.oee || 0) / 100)"
                          stroke-linecap="round" transform="rotate(-90 60 60)"/>
                </svg>
                <div class="gauge-value">{{ oeeData?.oee || 0 }}%</div>
                <div class="gauge-label">OEE</div>
              </div>
            </div>

            <div class="oee-factors">
              <div class="oee-factor">
                <div class="factor-header">
                  <span>⏱ Availability</span>
                  <span class="factor-value">{{ oeeData?.availability || 0 }}%</span>
                </div>
                <div class="factor-bar"><div class="factor-fill availability" [style.width.%]="oeeData?.availability || 0"></div></div>
                <p class="factor-detail">Thời gian chạy: {{ oeeData?.details?.totalRunTimeHours || 0 }}h / {{ oeeData?.details?.plannedTimeHours || 0 }}h kế hoạch</p>
              </div>

              <div class="oee-factor">
                <div class="factor-header">
                  <span>⚡ Performance</span>
                  <span class="factor-value">{{ oeeData?.performance || 0 }}%</span>
                </div>
                <div class="factor-bar"><div class="factor-fill performance" [style.width.%]="oeeData?.performance || 0"></div></div>
                <p class="factor-detail">Tốc độ thực tế: {{ oeeData?.details?.actualRatePerHour || 0 }} SP/giờ</p>
              </div>

              <div class="oee-factor">
                <div class="factor-header">
                  <span>✅ Quality</span>
                  <span class="factor-value">{{ oeeData?.quality || 0 }}%</span>
                </div>
                <div class="factor-bar"><div class="factor-fill quality" [style.width.%]="oeeData?.quality || 0"></div></div>
                <p class="factor-detail">OK: {{ (oeeData?.details?.totalOk || 0) | number }} / Tổng: {{ (oeeData?.details?.totalProduced || 0) | number }}</p>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
    styles: [`
    .reports-container { padding: 1.5rem; max-width: 1400px; margin: 0 auto; animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    .reports-header h1 { font-size: 1.8rem; margin-bottom: 0.3rem; }
    .subtitle { color: var(--text-secondary, #999); font-size: 0.9rem; }

    /* Filters */
    .filters-bar { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; margin: 1.5rem 0; padding: 1rem; background: var(--card-bg, #1a1a2e); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
    .filter-group { display: flex; flex-direction: column; gap: 0.3rem; }
    .filter-group label { font-size: 0.75rem; color: var(--text-secondary, #aaa); text-transform: uppercase; letter-spacing: 0.5px; }
    .filter-group input, .filter-group select { padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); color: white; font-size: 0.85rem; }
    .filter-actions { display: flex; gap: 0.5rem; margin-left: auto; }
    .btn-primary { padding: 0.5rem 1rem; border-radius: 8px; border: none; background: var(--accent, #e74c3c); color: white; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
    .btn-primary:hover { transform: translateY(-1px); filter: brightness(1.15); }
    .btn-outline { padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--accent, #e74c3c); background: transparent; color: var(--accent, #e74c3c); cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
    .btn-outline:hover { background: rgba(231,76,60,0.1); }
    .btn-sm { padding: 0.35rem 0.75rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: #aaa; cursor: pointer; font-size: 0.8rem; }
    .btn-sm:hover { border-color: var(--accent); color: var(--accent); }

    /* Tabs */
    .tabs { display: flex; gap: 0; border-bottom: 2px solid rgba(255,255,255,0.08); margin-bottom: 1.5rem; overflow-x: auto; }
    .tabs button { padding: 0.75rem 1.25rem; border: none; background: none; color: var(--text-secondary, #888); cursor: pointer; font-size: 0.9rem; border-bottom: 2px solid transparent; margin-bottom: -2px; white-space: nowrap; transition: all 0.2s; }
    .tabs button.active { color: var(--accent, #e74c3c); border-bottom-color: var(--accent, #e74c3c); }
    .tabs button:hover:not(.active) { color: white; }

    /* Loading */
    .loading-spinner { display: flex; flex-direction: column; align-items: center; padding: 3rem; }
    .spinner { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Summary Cards */
    .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-card { padding: 1.25rem; border-radius: 12px; background: var(--card-bg, #1a1a2e); border: 1px solid rgba(255,255,255,0.08); }
    .stat-card.green { border-left: 4px solid #2ecc71; }
    .stat-card.red { border-left: 4px solid #e74c3c; }
    .stat-card.blue { border-left: 4px solid #3498db; }
    .stat-card.purple { border-left: 4px solid #9b59b6; }
    .stat-value { font-size: 1.8rem; font-weight: 700; margin-bottom: 0.3rem; }
    .stat-label { font-size: 0.8rem; color: var(--text-secondary, #aaa); text-transform: uppercase; letter-spacing: 0.5px; }

    /* Bar Chart */
    .chart-section { background: var(--card-bg, #1a1a2e); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid rgba(255,255,255,0.08); }
    .chart-section h3 { margin-bottom: 1rem; font-size: 1rem; }
    .bar-chart { display: flex; flex-direction: column; gap: 0.5rem; max-height: 400px; overflow-y: auto; }
    .bar-group { display: grid; grid-template-columns: 80px 1fr 70px; gap: 0.5rem; align-items: center; }
    .bar-label { font-size: 0.75rem; color: #aaa; text-align: right; }
    .bar-track { display: flex; height: 24px; border-radius: 4px; background: rgba(255,255,255,0.05); overflow: hidden; }
    .bar.ok { background: linear-gradient(90deg, #27ae60, #2ecc71); transition: width 0.5s ease; }
    .bar.ng { background: linear-gradient(90deg, #c0392b, #e74c3c); transition: width 0.5s ease; }
    .bar-value { font-size: 0.8rem; color: #ccc; }
    .chart-legend { display: flex; gap: 1.5rem; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.08); }
    .legend-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: #aaa; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot.green { background: #2ecc71; }
    .dot.red { background: #e74c3c; }

    /* Data Tables */
    .data-table-container { background: var(--card-bg, #1a1a2e); border-radius: 12px; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.08); }
    .table-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .table-header-row h3 { font-size: 1rem; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { padding: 0.75rem; text-align: left; font-size: 0.75rem; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .data-table td { padding: 0.65rem 0.75rem; font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .data-table tbody tr:hover { background: rgba(255,255,255,0.03); }
    .text-green { color: #2ecc71; }
    .text-red { color: #e74c3c; }
    .text-blue { color: #3498db; }
    .bold { font-weight: 600; }
    .top-performer { background: rgba(46,204,113,0.05); }

    /* Progress bar in table */
    .progress-cell { display: flex; align-items: center; gap: 0.5rem; }
    .progress-bar { flex: 1; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.1); overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #e74c3c, #e67e22); transition: width 0.5s ease; }
    .progress-fill.complete { background: linear-gradient(90deg, #27ae60, #2ecc71); }
    .progress-fill.danger { background: linear-gradient(90deg, #c0392b, #e74c3c); }

    /* Status badges */
    .status-badge { padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 500; }
    .status-pending { background: rgba(241,196,15,0.15); color: #f1c40f; }
    .status-in_progress { background: rgba(52,152,219,0.15); color: #3498db; }
    .status-completed { background: rgba(46,204,113,0.15); color: #2ecc71; }
    .status-cancelled { background: rgba(149,165,166,0.15); color: #95a5a6; }
    .status-overdue { background: rgba(231,76,60,0.15); color: #e74c3c; }
    .overdue { background: rgba(231,76,60,0.05); }

    /* NG Grid */
    .ng-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .ng-section { background: var(--card-bg, #1a1a2e); border-radius: 12px; padding: 1.25rem; border: 1px solid rgba(255,255,255,0.08); }
    .ng-section h3 { font-size: 1rem; margin-bottom: 1rem; }
    .ng-section.full-width { grid-column: 1 / -1; }
    .empty-msg { color: #666; font-style: italic; padding: 1rem 0; }
    .reason-bars { display: flex; flex-direction: column; gap: 0.75rem; }
    .reason-item { display: grid; grid-template-columns: 150px 1fr 120px; gap: 0.5rem; align-items: center; }
    .reason-label { font-size: 0.85rem; color: #ccc; }
    .reason-bar-track { height: 20px; border-radius: 4px; background: rgba(255,255,255,0.05); overflow: hidden; }
    .reason-bar { height: 100%; background: linear-gradient(90deg, #e67e22, #e74c3c); border-radius: 4px; transition: width 0.5s ease; }
    .reason-value { font-size: 0.8rem; color: #aaa; }
    .tag-list { font-size: 0.75rem; color: #aaa; }

    /* OEE */
    .oee-grid { display: grid; grid-template-columns: 280px 1fr; gap: 2rem; align-items: start; }
    .oee-gauge { display: flex; justify-content: center; padding: 1.5rem; background: var(--card-bg, #1a1a2e); border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); }
    .oee-gauge.good { color: #2ecc71; }
    .oee-gauge.warning { color: #f39c12; }
    .oee-gauge.danger { color: #e74c3c; }
    .gauge-circle { position: relative; width: 200px; height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .gauge-circle svg { position: absolute; width: 100%; height: 100%; }
    .gauge-value { font-size: 2.5rem; font-weight: 700; z-index: 1; }
    .gauge-label { font-size: 0.9rem; color: #aaa; z-index: 1; }

    .oee-factors { display: flex; flex-direction: column; gap: 1.25rem; }
    .oee-factor { background: var(--card-bg, #1a1a2e); border-radius: 12px; padding: 1.25rem; border: 1px solid rgba(255,255,255,0.08); }
    .factor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; font-size: 0.95rem; }
    .factor-value { font-weight: 700; font-size: 1.1rem; }
    .factor-bar { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.08); overflow: hidden; margin-bottom: 0.5rem; }
    .factor-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease; }
    .factor-fill.availability { background: linear-gradient(90deg, #3498db, #2980b9); }
    .factor-fill.performance { background: linear-gradient(90deg, #f39c12, #e67e22); }
    .factor-fill.quality { background: linear-gradient(90deg, #2ecc71, #27ae60); }
    .factor-detail { font-size: 0.8rem; color: #888; }

    @media (max-width: 768px) {
      .ng-grid { grid-template-columns: 1fr; }
      .oee-grid { grid-template-columns: 1fr; }
      .summary-cards { grid-template-columns: repeat(2, 1fr); }
      .filters-bar { flex-direction: column; }
      .filter-actions { margin-left: 0; }
    }
  `],
})
export class ReportsComponent implements OnInit {
    startDate = this.getDateStr(-30);
    endDate = this.getDateStr(0);
    groupBy = 'day';
    activeTab = 'summary';
    loading = signal(false);

    productionData: ProductionSummary[] = [];
    workerData: WorkerProductivity[] = [];
    orderData: OrderCompletion[] = [];
    ngData: NgAnalysis | null = null;
    oeeData: OEEData | null = null;

    constructor(private reportsService: ReportsService) { }

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.loading.set(true);
        this.loadProductionSummary();
        this.loadWorkerProductivity();
        this.loadOrderCompletion();
        this.loadNgAnalysis();
        this.loadOEE();
    }

    loadProductionSummary() {
        this.reportsService.getProductionSummary(this.startDate, this.endDate, this.groupBy)
            .subscribe({
                next: (res) => { this.productionData = res.data || []; this.loading.set(false); },
                error: () => this.loading.set(false),
            });
    }

    loadWorkerProductivity() {
        this.reportsService.getWorkerProductivity(this.startDate, this.endDate)
            .subscribe({ next: (res) => { this.workerData = res.data || []; } });
    }

    loadOrderCompletion() {
        this.reportsService.getOrderCompletion()
            .subscribe({ next: (res) => { this.orderData = res.data || []; } });
    }

    loadNgAnalysis() {
        this.reportsService.getNgAnalysis(this.startDate, this.endDate)
            .subscribe({ next: (res) => { this.ngData = res.data || null; } });
    }

    loadOEE() {
        this.reportsService.getOEE(this.startDate, this.endDate)
            .subscribe({ next: (res) => { this.oeeData = res.data || null; } });
    }

    exportExcel(type: string) {
        this.reportsService.exportExcel(type, this.startDate, this.endDate);
    }

    // ─── Helpers ──────────────────────────────────────────────────

    getTotalOk(): number { return this.productionData.reduce((s, d) => s + d.okQty, 0); }
    getTotalNg(): number { return this.productionData.reduce((s, d) => s + d.ngQty, 0); }
    getTotalHours(): string { return this.productionData.reduce((s, d) => s + d.totalHours, 0).toFixed(1); }
    getAvgProductivity(): string {
        const hours = this.productionData.reduce((s, d) => s + d.totalHours, 0);
        return hours > 0 ? Math.round(this.getTotalOk() / hours).toLocaleString() : '0';
    }

    getBarWidth(value: number): number {
        const maxVal = Math.max(...this.productionData.map(d => d.totalQty));
        return maxVal > 0 ? (value / maxVal) * 100 : 0;
    }

    getReasonBarWidth(qty: number): number {
        const maxQty = Math.max(...(this.ngData?.byReason || []).map(r => r.totalQty));
        return maxQty > 0 ? (qty / maxQty) * 100 : 0;
    }

    formatPeriod(period: string): string {
        if (period.startsWith('W')) return period.substring(1);
        if (period.length === 7) return period; // YYYY-MM
        return period.substring(5); // MM-DD
    }

    getStatusLabel(status: string): string {
        const map: Record<string, string> = {
            'PENDING': 'Chờ SX',
            'IN_PROGRESS': 'Đang SX',
            'COMPLETED': 'Hoàn thành',
            'CANCELLED': 'Đã hủy',
            'OVERDUE': 'Quá hạn',
        };
        return map[status] || status;
    }

    parseFloat(val: string): number { return Number.parseFloat(val); }

    private getDateStr(offsetDays: number): string {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        return d.toISOString().split('T')[0];
    }
}
