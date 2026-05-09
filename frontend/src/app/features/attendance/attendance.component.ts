import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService, AttendanceSummary } from '../../core/services/hr.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-attendance',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="att-module">
      <!-- Toolbar -->
      <div class="att-toolbar">
        <div class="toolbar-left">
          <div class="toolbar-tabs">
            <button class="t-tab" [class.active]="subTab === 'records'" (click)="subTab = 'records'; loadDetails()">Chấm công</button>
            <button class="t-tab" [class.active]="subTab === 'summary'" (click)="subTab = 'summary'; loadSummary()">Tổng quan</button>
          </div>
          <div class="toolbar-filters">
            <select [(ngModel)]="attMonth" (change)="reload()" class="filter-select">
              <option *ngFor="let m of months" [ngValue]="m.v">{{m.label}}</option>
            </select>
            <select [(ngModel)]="attYear" (change)="reload()" class="filter-select">
              <option [ngValue]="2025">2025</option>
              <option [ngValue]="2026">2026</option>
            </select>
          </div>
        </div>
        <div class="toolbar-right">
          <input class="search-input" type="text" placeholder="🔍 Tìm kiếm nhân viên..."
                 [(ngModel)]="searchTerm" (ngModelChange)="applyFilter()">
          <span class="toolbar-info">{{filteredDetails().length}} bản ghi</span>
          <button class="btn-checkin" (click)="doCheckIn()">🟢 Check-in</button>
          <button class="btn-checkout" (click)="doCheckOut()">🔴 Check-out</button>
        </div>
      </div>

      <!-- Records Table -->
      <div class="att-table-wrap" *ngIf="subTab === 'records'">
        <table class="att-table">
          <thead>
            <tr>
              <th class="th-emp">Nhân viên</th>
              <th>Ca làm</th>
              <th>Ngày</th>
              <th>Giờ vào</th>
              <th class="th-icon">⬇</th>
              <th>Giờ ra</th>
              <th>Giờ đã làm việc</th>
              <th>Giờ làm thêm</th>
              <th>Đi trễ</th>
              <th>Về sớm</th>
              <th class="th-icon">Đi trễ?</th>
              <th class="th-icon">Về sớm?</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of filteredDetails()">
              <td class="td-emp">
                <span class="emp-dot" [style.background]="getColor(r.user?.fullName || '')"></span>
                {{r.user?.fullName || '-'}}
              </td>
              <td>{{r.shift?.name || r.note || '-'}}</td>
              <td class="td-date">{{r.date | date:'dd/MM/yyyy'}}</td>
              <td class="td-time">{{r.checkIn ? (r.checkIn | date:'dd/MM/yyyy HH:mm:ss') : '-'}}</td>
              <td class="td-icon">
                <span class="check-icon" *ngIf="r.checkIn">✅</span>
              </td>
              <td class="td-time">{{r.checkOut ? (r.checkOut | date:'dd/MM/yyyy HH:mm:ss') : '-'}}</td>
              <td class="td-hours">{{calcWorkHours(r)}}</td>
              <td class="td-hours">{{r.overtimeHours ? formatHM(r.overtimeHours) : '00:00'}}</td>
              <td class="td-late" [class.has-value]="getLateMin(r) > 0">
                {{getLateMin(r) > 0 ? formatMinToHM(getLateMin(r)) : '00:00'}}
              </td>
              <td class="td-early" [class.has-value]="getEarlyMin(r) > 0">
                {{getEarlyMin(r) > 0 ? formatMinToHM(getEarlyMin(r)) : '00:00'}}
              </td>
              <td class="td-icon"><span *ngIf="getLateMin(r) > 0">✅</span></td>
              <td class="td-icon"><span *ngIf="getEarlyMin(r) > 0">✅</span></td>
            </tr>
          </tbody>
        </table>
        <div class="empty-state" *ngIf="filteredDetails().length === 0">
          Chưa có dữ liệu chấm công tháng này
        </div>
      </div>

      <!-- Summary Table -->
      <div class="att-table-wrap" *ngIf="subTab === 'summary'">
        <table class="att-table">
          <thead>
            <tr>
              <th class="th-emp">Nhân viên</th>
              <th>Bộ phận</th>
              <th>Ngày công</th>
              <th>Có mặt</th>
              <th>Đi muộn</th>
              <th>Vắng</th>
              <th>Nghỉ phép</th>
              <th>OT (giờ)</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of filteredSummary()">
              <td class="td-emp">
                <span class="emp-dot" [style.background]="getColor(s.fullName)"></span>
                {{s.fullName}}
              </td>
              <td>{{s.department}}</td>
              <td>{{s.totalDays}}</td>
              <td class="td-green">{{s.presentDays}}</td>
              <td class="td-yellow">{{s.lateDays}}</td>
              <td class="td-red">{{s.absentDays}}</td>
              <td>{{s.leaveDays}}</td>
              <td class="td-blue">{{s.totalOT}}</td>
            </tr>
          </tbody>
        </table>
        <div class="empty-state" *ngIf="filteredSummary().length === 0">
          Chưa có dữ liệu chấm công tháng này
        </div>
      </div>
    </div>
    `,
    styles: [`
      .att-module { display: flex; flex-direction: column; height: 100%; font-family: 'Inter', sans-serif; background: #fff; }

      /* Toolbar */
      .att-toolbar {
        display: flex; align-items: center; justify-content: space-between;
        padding: 8px 16px; border-bottom: 1px solid #DEE2E6; flex-shrink: 0;
        gap: 12px; flex-wrap: wrap;
      }
      .toolbar-left { display: flex; align-items: center; gap: 12px; }
      .toolbar-right { display: flex; align-items: center; gap: 8px; }
      .toolbar-tabs { display: flex; gap: 2px; }
      .t-tab {
        padding: 6px 14px; border: 1px solid #CED4DA; background: #fff;
        font-size: 13px; cursor: pointer; color: #495057; font-family: 'Inter', sans-serif;
        transition: all 0.1s;
      }
      .t-tab:first-child { border-radius: 4px 0 0 4px; }
      .t-tab:last-child { border-radius: 0 4px 4px 0; }
      .t-tab.active { background: var(--odoo-purple, #714B67); color: #fff; border-color: var(--odoo-purple, #714B67); }
      .t-tab:hover:not(.active) { background: #F4F6F8; }

      .toolbar-filters { display: flex; gap: 6px; }
      .filter-select {
        padding: 6px 10px; border: 1px solid #CED4DA; border-radius: 4px;
        font-size: 13px; font-family: 'Inter', sans-serif; color: #212529;
        outline: none; background: #fff;
      }
      .filter-select:focus { border-color: var(--odoo-purple, #714B67); }

      .search-input {
        padding: 6px 12px; border: 1px solid #CED4DA; border-radius: 4px;
        font-size: 13px; width: 200px; outline: none; font-family: 'Inter', sans-serif;
      }
      .search-input:focus { border-color: var(--odoo-purple, #714B67); box-shadow: 0 0 0 2px rgba(113,75,103,0.1); }

      .toolbar-info { font-size: 12px; color: #6C757D; white-space: nowrap; }

      .btn-checkin, .btn-checkout {
        padding: 6px 12px; border: none; border-radius: 4px;
        font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif;
      }
      .btn-checkin { background: #D4EDDA; color: #155724; }
      .btn-checkin:hover { background: #C3E6CB; }
      .btn-checkout { background: #F8D7DA; color: #721C24; }
      .btn-checkout:hover { background: #F5C6CB; }

      /* Table */
      .att-table-wrap { flex: 1; overflow: auto; }
      .att-table {
        width: 100%; border-collapse: collapse; font-size: 13px;
        white-space: nowrap;
      }
      .att-table thead { position: sticky; top: 0; z-index: 5; }
      .att-table th {
        background: #F8F9FA; color: #495057; font-weight: 600;
        padding: 10px 12px; text-align: left; border-bottom: 2px solid #DEE2E6;
        font-size: 12px;
      }
      .att-table td {
        padding: 8px 12px; border-bottom: 1px solid #F0F0F0; color: #212529;
      }
      .att-table tr:hover td { background: #FAFAFA; }
      .th-emp { min-width: 180px; }
      .th-icon { width: 50px; text-align: center; }

      .td-emp { font-weight: 600; display: flex; align-items: center; gap: 8px; }
      .emp-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .td-date { color: #495057; }
      .td-time { color: #495057; font-variant-numeric: tabular-nums; }
      .td-hours { font-variant-numeric: tabular-nums; color: #495057; }
      .td-late.has-value { color: #E67E22; font-weight: 600; }
      .td-early.has-value { color: #E74C3C; font-weight: 600; }
      .td-icon { text-align: center; }
      .check-icon { color: #27AE60; }
      .td-green { color: #27AE60; font-weight: 600; }
      .td-yellow { color: #F39C12; font-weight: 600; }
      .td-red { color: #E74C3C; font-weight: 600; }
      .td-blue { color: #2980B9; font-weight: 600; }

      .empty-state { text-align: center; padding: 60px 20px; color: #ADB5BD; font-size: 14px; }
    `]
})
export class AttendanceComponent implements OnInit {
    subTab: 'records' | 'summary' = 'records';
    searchTerm = '';
    attMonth = new Date().getMonth() + 1;
    attYear = new Date().getFullYear();

    details = signal<any[]>([]);
    summary = signal<AttendanceSummary[]>([]);
    filteredDetails = signal<any[]>([]);
    filteredSummary = signal<AttendanceSummary[]>([]);

    private auth = inject(AuthService);
    isAdmin = this.auth.isAdmin;
    isManager = this.auth.isManager;
    isWorker = this.auth.isWorker;
    currentUser = this.auth.user;

    months = [
        { v: 1, label: 'Tháng 1' }, { v: 2, label: 'Tháng 2' }, { v: 3, label: 'Tháng 3' },
        { v: 4, label: 'Tháng 4' }, { v: 5, label: 'Tháng 5' }, { v: 6, label: 'Tháng 6' },
        { v: 7, label: 'Tháng 7' }, { v: 8, label: 'Tháng 8' }, { v: 9, label: 'Tháng 9' },
        { v: 10, label: 'Tháng 10' }, { v: 11, label: 'Tháng 11' }, { v: 12, label: 'Tháng 12' },
    ];

    private COLORS = ['#E74C3C','#8E44AD','#2980B9','#27AE60','#F39C12','#D35400','#1ABC9C','#C0392B','#7D3C98','#2E86C1'];

    constructor(private hrService: HrService) {}

    ngOnInit() { this.reload(); }

    reload() {
        if (this.subTab === 'records') this.loadDetails();
        else this.loadSummary();
    }

    loadDetails() {
        const userId = this.isWorker() ? this.currentUser()?.id : undefined;
        this.hrService.getAttendance(this.attMonth, this.attYear, userId)
            .subscribe(r => {
                let data = r.data || [];
                if (this.isWorker()) {
                    data = data.filter(d => d.userId === this.currentUser()?.id);
                }
                this.details.set(data);
                this.applyFilter();
            });
    }

    loadSummary() {
        this.hrService.getAttendanceSummary(this.attMonth, this.attYear)
            .subscribe(r => {
                let data = r.data || [];
                if (this.isWorker()) {
                    data = data.filter(s => s.userId === this.currentUser()?.id);
                }
                this.summary.set(data);
                this.applyFilter();
            });
    }

    applyFilter() {
        const term = this.searchTerm.toLowerCase().trim();
        if (this.subTab === 'records') {
            const filtered = term
                ? this.details().filter(r => r.user?.fullName?.toLowerCase().includes(term))
                : this.details();
            this.filteredDetails.set(filtered);
        } else {
            const filtered = term
                ? this.summary().filter(s => s.fullName.toLowerCase().includes(term))
                : this.summary();
            this.filteredSummary.set(filtered);
        }
    }

    getColor(name: string): string {
        let h = 0;
        for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
        return this.COLORS[Math.abs(h) % this.COLORS.length];
    }

    calcWorkHours(r: any): string {
        if (!r.checkIn || !r.checkOut) return '00:00';
        const ms = new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime();
        const totalMin = Math.floor(ms / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    formatHM(hours: number): string {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    formatMinToHM(min: number): string {
        const h = Math.floor(min / 60);
        const m = min % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    getLateMin(r: any): number {
        if (!r.checkIn) return 0;
        let startH = 8, startM = 0;
        if (r.shift?.startTime) [startH, startM] = r.shift.startTime.split(':').map(Number);
        else if (r.note?.includes('SX')) startH = 7;
        const ci = new Date(r.checkIn);
        const late = (ci.getHours() * 60 + ci.getMinutes()) - (startH * 60 + startM);
        return late > 0 ? late : 0;
    }

    getEarlyMin(r: any): number {
        if (!r.checkOut) return 0;
        let endH = 17, endM = 0;
        if (r.shift?.endTime) [endH, endM] = r.shift.endTime.split(':').map(Number);
        else if (r.note?.includes('SX')) endH = 16;
        const co = new Date(r.checkOut);
        const early = (endH * 60 + endM) - (co.getHours() * 60 + co.getMinutes());
        return early > 0 ? early : 0;
    }

    doCheckIn() {
        this.hrService.checkIn().subscribe({
            next: () => { alert('✅ Check-in thành công!'); this.reload(); },
            error: (e) => alert(e.error?.message || 'Lỗi check-in'),
        });
    }

    doCheckOut() {
        this.hrService.checkOut().subscribe({
            next: () => { alert('✅ Check-out thành công!'); this.reload(); },
            error: (e) => alert(e.error?.message || 'Lỗi check-out'),
        });
    }
}
