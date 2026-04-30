import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService, Department, Shift, Employee, AttendanceSummary } from '../../core/services/hr.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-hr',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="hr-container">
      <div class="header">
        <h1>👥 Quản lý Nhân sự &amp; Chấm công</h1>
        <div class="header-actions">
          <button class="btn-success" (click)="doCheckIn()">🟢 Check-in</button>
          <button class="btn-warning" (click)="doCheckOut()">🔴 Check-out</button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button [class.active]="activeTab === 'employees'" (click)="activeTab = 'employees'" *ngIf="isAdmin() || isManager()">👤 Nhân viên</button>
        <button [class.active]="activeTab === 'attendance'" (click)="activeTab = 'attendance'; loadAttendance()">📅 Chấm công</button>
        <button [class.active]="activeTab === 'violations'" (click)="activeTab = 'violations'; loadViolationReport()" *ngIf="isAdmin() || isManager()">🚫 Vi phạm</button>
        <button [class.active]="activeTab === 'settings'" (click)="activeTab = 'settings'" *ngIf="isAdmin() || isManager()">⚙️ Cấu hình</button>
      </div>

      <!-- Tab 1: Employees -->
      @if (activeTab === 'employees') {
        <div class="tab-content">
          <div class="filters-row">
            <div class="search-box">
              <span>🔍</span>
              <input type="text" placeholder="Tìm nhân viên..." [(ngModel)]="empSearch" (ngModelChange)="loadEmployees()">
            </div>
            <select [(ngModel)]="empDeptFilter" (change)="loadEmployees()">
              <option [ngValue]="undefined">Tất cả bộ phận</option>
              @for (d of departments(); track d.id) {
                <option [ngValue]="d.id">{{ d.name }}</option>
              }
            </select>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Bộ phận</th>
                  <th>Chức vụ</th>
                  <th>SĐT</th>
                  <th>Ngày vào</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (e of employees(); track e.id) {
                  <tr>
                    <td class="bold">{{ e.fullName }}</td>
                    <td><span class="badge dept">{{ e.department?.name || '-' }}</span></td>
                    <td>{{ e.position || '-' }}</td>
                    <td>{{ e.phone || '-' }}</td>
                    <td>{{ e.joinDate ? (e.joinDate | date:'dd/MM/yyyy') : '-' }}</td>
                    <td><span class="badge" [class.active]="e.isActive" [class.inactive]="!e.isActive">{{ e.isActive ? 'Hoạt động' : 'Nghỉ' }}</span></td>
                    <td>
                      <button class="btn-icon" (click)="openEmpModal(e)" title="Sửa">✏️</button>
                      <button class="btn-icon" (click)="deleteEmployee(e)" title="Xóa">🗑️</button>
                    </td>
                  </tr>
                }
                @if (employees().length === 0) {
                  <tr><td colspan="7" class="empty">Không tìm thấy nhân viên</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Tab 2: Attendance -->
      @if (activeTab === 'attendance') {
        <div class="tab-content">
          <!-- Worker Personal Summary -->
          @if (isWorker() && summary().length > 0) {
            <div class="personal-summary-grid">
              <div class="summary-card">
                <span class="label">Ngày công</span>
                <span class="value">{{ summary()[0].totalDays }}</span>
              </div>
              <div class="summary-card green">
                <span class="label">Có mặt</span>
                <span class="value">{{ summary()[0].presentDays }}</span>
              </div>
              <div class="summary-card yellow">
                <span class="label">Đi muộn</span>
                <span class="value">{{ summary()[0].lateDays }}</span>
              </div>
              <div class="summary-card blue">
                <span class="label">OT (giờ)</span>
                <span class="value">{{ summary()[0].totalOT }}</span>
              </div>
            </div>
          }

          <div class="filters-row">
            <div class="date-filters">
              <select [(ngModel)]="attMonth" (change)="loadAttendance()">
                @for (m of months; track m.v) {
                  <option [ngValue]="m.v">{{ m.label }}</option>
                }
              </select>
              <select [(ngModel)]="attYear" (change)="loadAttendance()">
                <option [ngValue]="2025">2025</option>
                <option [ngValue]="2026">2026</option>
              </select>
            </div>
            
            <div class="mode-toggle" *ngIf="isAdmin() || isManager()">
              <button [class.active]="attMode() === 'summary'" (click)="setAttMode('summary')">Thống kê</button>
              <button [class.active]="attMode() === 'detail'" (click)="setAttMode('detail')">Chi tiết</button>
            </div>
          </div>

          @if (attMode() === 'summary') {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nhân viên</th>
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
                  @for (s of summary(); track s.userId) {
                    <tr>
                      <td class="bold">{{ s.fullName }}</td>
                      <td>{{ s.department }}</td>
                      <td>{{ s.totalDays }}</td>
                      <td class="text-green">{{ s.presentDays }}</td>
                      <td class="text-yellow">{{ s.lateDays }}</td>
                      <td class="text-red">{{ s.absentDays }}</td>
                      <td>{{ s.leaveDays }}</td>
                      <td class="text-blue">{{ s.totalOT }}</td>
                    </tr>
                  }
                  @if (summary().length === 0) {
                    <tr><td colspan="8" class="empty">Chưa có dữ liệu chấm công tháng này</td></tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="table-wrap">
              <table class="detail-table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th *ngIf="isAdmin() || isManager()">Nhân viên</th>
                    <th>Ca làm</th>
                    <th>Giờ vào</th>
                    <th>Giờ ra</th>
                    <th>Số giờ</th>
                    <th>Đi muộn</th>
                    <th>Về sớm</th>
                    <th>Tăng ca</th>
                    <th *ngIf="isAdmin() || isManager()">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of details(); track r.id) {
                    <tr>
                      <td class="bold">{{ r.date | date:'dd/MM' }} ({{ r.date | date:'EEE' }})</td>
                      <td *ngIf="isAdmin() || isManager()">{{ r.user.fullName }}</td>
                      <td><span class="badge shift">{{ r.shift?.name || '-' }}</span></td>
                      <td [class.text-red]="isLate(r)">{{ r.checkIn ? (r.checkIn | date:'HH:mm:ss') : '-' }}</td>
                      <td>{{ r.checkOut ? (r.checkOut | date:'HH:mm:ss') : '-' }}</td>
                      <td>{{ calculateWorkHours(r) }}h</td>
                      <td><span class="text-yellow" *ngIf="getLateMinutes(r) > 0">{{ getLateMinutes(r) }}p</span></td>
                      <td><span class="text-red" *ngIf="getEarlyMinutes(r) > 0">{{ getEarlyMinutes(r) }}p</span></td>
                      <td><span class="text-blue" *ngIf="r.overtimeHours > 0">+{{ r.overtimeHours }}h</span></td>
                      <td *ngIf="isAdmin() || isManager()">
                        <button class="btn-icon" (click)="openAttModal(r)">✏️</button>
                      </td>
                    </tr>
                  }
                  @if (details().length === 0) {
                    <tr><td [attr.colspan]="isAdmin() || isManager() ? 10 : 9" class="empty">Chưa có dữ liệu chi tiết</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- Tab 3: Departments & Shifts -->
      @if (activeTab === 'settings') {
        <div class="tab-content settings-grid">
          <!-- Departments -->
          <div class="settings-card">
            <div class="card-header">
              <h3>🏢 Bộ phận</h3>
              <button class="btn-sm" (click)="openDeptModal()">+ Thêm</button>
            </div>
            @for (d of departments(); track d.id) {
              <div class="setting-item">
                <div>
                  <strong>{{ d.name }}</strong>
                  <span class="sub">{{ d.description || '' }}</span>
                </div>
                <div class="item-actions">
                  <button class="btn-icon" (click)="openDeptModal(d)">✏️</button>
                  <button class="btn-icon" (click)="deleteDept(d.id)">🗑️</button>
                </div>
              </div>
            }
          </div>
          <!-- Shifts -->
          <div class="settings-card">
            <div class="card-header">
              <h3>🕐 Ca làm việc</h3>
              <button class="btn-sm" (click)="openShiftModal()">+ Thêm</button>
            </div>
            @for (s of shifts(); track s.id) {
              <div class="setting-item">
                <div>
                  <strong>{{ s.name }}</strong>
                  <span class="sub">{{ s.startTime }} - {{ s.endTime }}</span>
                </div>
                <div class="item-actions">
                  <button class="btn-icon" (click)="openShiftModal(s)">✏️</button>
                  <button class="btn-icon" (click)="deleteShift(s.id)">🗑️</button>
                </div>
              </div>
            }
          </div>
          <!-- Attendance Machines -->
          <div class="settings-card full-width">
            <div class="card-header">
              <h3>📠 Máy chấm công</h3>
              <div class="actions">
                <button class="btn-success btn-sm" (click)="autoMapUsers()" [disabled]="syncing()">🔗 Tự động gán ID</button>
                <button class="btn-success btn-sm" (click)="syncMachines()" [disabled]="syncing()">
                  {{ syncing() ? '⌛ Đang đồng bộ...' : '🔄 Đồng bộ dữ liệu' }}
                </button>
                <button class="btn-sm" (click)="openMachineModal()">+ Thêm máy</button>
              </div>
            </div>
            @for (m of machines(); track m.id) {
              <div class="setting-item">
                <div>
                  <strong>{{ m.name }}</strong>
                  <span class="sub">{{ m.ip }}:{{ m.port }}</span>
                  <span class="last-sync" *ngIf="m.lastSync"> - Lần cuối: {{ m.lastSync | date:'HH:mm dd/MM' }}</span>
                </div>
                <div class="item-actions">
                  <button class="btn-sm" (click)="loadMachineUsers(m.id, m.name)">👥 Gán ID</button>
                  <button class="btn-icon" (click)="openMachineModal(m)">✏️</button>
                  <button class="btn-icon" (click)="deleteMachine(m.id)">🗑️</button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Tab 4: Violation Report -->
      @if (activeTab === 'violations') {
        <div class="tab-content">
          <div class="filters-row">
            <div class="date-filters">
              <select [(ngModel)]="attMonth" (change)="loadViolationReport()">
                @for (m of months; track m.v) {
                  <option [ngValue]="m.v">{{ m.label }}</option>
                }
              </select>
              <select [(ngModel)]="attYear" (change)="loadViolationReport()">
                <option [ngValue]="2025">2025</option>
                <option [ngValue]="2026">2026</option>
              </select>
            </div>
            <button class="btn-primary btn-sm" (click)="loadViolationReport()" style="padding: 0.4rem 1rem;">🔄 Cập nhật</button>
          </div>

          @if (violationReport()) {
            <div class="stats-overview">
              <div class="stat-box premium">
                <div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="stat-content">
                  <span class="st-val text-red">{{ violationReport().totalViolations }}</span>
                  <span class="st-lbl">Tổng số vi phạm</span>
                </div>
              </div>
              <div class="stat-box premium">
                <div class="stat-icon yellow"><i class="fas fa-users"></i></div>
                <div class="stat-content">
                  <span class="st-val text-yellow">{{ violationReport().uniqueViolators }}</span>
                  <span class="st-lbl">Số người vi phạm</span>
                </div>
              </div>
              <div class="stat-box premium">
                <div class="stat-icon blue"><i class="fas fa-building"></i></div>
                <div class="stat-content">
                  <span class="st-val text-blue">{{ violationReport().departmentBreakdown.length }}</span>
                  <span class="st-lbl">Bộ phận có vi phạm</span>
                </div>
              </div>
            </div>

            <div class="report-grid">
              <!-- Top Violators -->
              <div class="report-card">
                <div class="card-header">
                  <h3>🏆 Danh sách vi phạm (Nhiều nhất lên đầu)</h3>
                </div>
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Họ tên</th>
                        <th>Phòng ban</th>
                        <th style="text-align:right">Số lần</th>
                        <th style="width: 50px"></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (v of violationReport().topViolators; track v.userId) {
                        <tr [class.selected]="selectedViolator()?.userId === v.userId" (click)="selectedViolator.set(v)" style="cursor: pointer;">
                          <td class="bold">{{ v.fullName }}</td>
                          <td>{{ v.department }}</td>
                          <td class="text-red" style="text-align:right"><strong>{{ v.count }}</strong></td>
                          <td><i class="fas fa-chevron-right" style="color: #444; font-size: 0.7rem;"></i></td>
                        </tr>
                      }
                      @if (violationReport().topViolators.length === 0) {
                        <tr><td colspan="4" class="empty">Không có vi phạm</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="right-col">
                <!-- Department Breakdown -->
                <div class="report-card mb-4">
                  <div class="card-header">
                    <h3>🏢 Vi phạm theo bộ phận</h3>
                  </div>
                  <div class="dept-chart">
                    @for (d of violationReport().departmentBreakdown; track d.name) {
                      <div class="dept-bar-row">
                        <div class="dept-info">
                          <span class="dept-name">{{ d.name }}</span>
                          <span class="dept-count">{{ d.count }}</span>
                        </div>
                        <div class="bar-container">
                          <div class="bar" [style.width.%]="(d.count / (violationReport().totalViolations || 1)) * 100"></div>
                        </div>
                      </div>
                    }
                    @if (violationReport().departmentBreakdown.length === 0) {
                      <div class="empty">Không có dữ liệu bộ phận</div>
                    }
                  </div>
                </div>

                <!-- Violation Details -->
                @if (selectedViolator()) {
                  <div class="report-card detail-card animate-in">
                    <div class="card-header">
                      <h3>📅 Chi tiết: {{ selectedViolator().fullName }}</h3>
                      <button class="btn-icon" (click)="selectedViolator.set(null)">×</button>
                    </div>
                    <div class="table-wrap small">
                      <table>
                        <thead>
                          <tr>
                            <th>Ngày</th>
                            <th>Vào</th>
                            <th>Ra</th>
                            <th>Lỗi</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (d of selectedViolator().details; track d.date) {
                            <tr>
                              <td class="bold">{{ d.date | date:'dd/MM' }}</td>
                              <td>{{ (d.checkIn | date:'HH:mm') || '--:--' }}</td>
                              <td>{{ (d.checkOut | date:'HH:mm') || '--:--' }}</td>
                              <td>
                                @if (d.isLate) {
                                  <span class="badge inactive" title="Muộn {{ d.lateMinutes }} phút">M ({{ d.lateMinutes }}m)</span>
                                }
                                @if (d.isEarly) {
                                  <span class="badge warning" title="Về sớm {{ d.earlyMinutes }} phút">S ({{ d.earlyMinutes }}m)</span>
                                }
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                } @else {
                  <div class="report-card empty-detail">
                    <div class="empty">
                      <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                      <p>Chọn một nhân viên để xem chi tiết ngày vi phạm</p>
                    </div>
                  </div>
                }
              </div>
            </div>
          } @else {
             <div class="empty">Đang tải dữ liệu báo cáo...</div>
          }
        </div>
      }

      <!-- Machine Users Mapping Modal -->
      @if (showMachineUsersModal) {
        <div class="modal-backdrop" (click)="showMachineUsersModal = false">
          <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>👥 Gán nhân viên - Máy {{ machineUsersName }}</h3>
              <button class="modal-close" (click)="showMachineUsersModal = false">×</button>
            </div>
            <p style="color:#aaa; font-size:0.85rem; margin-bottom:12px;">
              Chọn nhân viên tương ứng với từng ID trên máy chấm công. Sau khi gán xong, nhấn "Đồng bộ dữ liệu" để lấy dữ liệu.
            </p>
            <div class="table-wrap" style="max-height:60vh; overflow-y:auto;">
              <table>
                <thead>
                  <tr>
                    <th>ID Máy</th>
                    <th>Tên trên máy</th>
                    <th>Nhân viên hệ thống</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (mu of machineUsersList(); track mu.uid) {
                    <tr [class.mapped]="mu.mappedName">
                      <td><strong>{{ mu.id }}</strong></td>
                      <td>{{ mu.name || '(không tên)' }}</td>
                      <td>
                        @if (mu.mappedName) {
                          <span class="badge badge-success">✅ {{ mu.mappedName }}</span>
                        } @else {
                          <select class="form-input" [(ngModel)]="mu.selectedUserId" [name]="'mu_' + mu.uid" style="padding:4px 8px; font-size:0.85rem;">
                            <option [ngValue]="0">-- Chọn nhân viên --</option>
                            @for (e of employees(); track e.id) {
                              <option [ngValue]="e.id">{{ e.fullName }}</option>
                            }
                          </select>
                        }
                      </td>
                      <td>
                        @if (!mu.mappedName && mu.selectedUserId > 0) {
                          <button class="btn-sm btn-success" (click)="mapMachineUser(mu)">Gán</button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- Employee Edit Modal -->
      @if (showEmpModal) {
        <div class="modal-backdrop" (click)="showEmpModal = false">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3>Cập nhật thông tin nhân viên</h3>
            <p class="modal-sub">{{ editingEmp?.fullName }}</p>
            <form (submit)="saveEmployee($event)">
              <div class="form-group">
                <label>Bộ phận</label>
                <select [(ngModel)]="empForm.departmentId" name="dept">
                  <option [ngValue]="null">-- Chọn --</option>
                  @for (d of departments(); track d.id) {
                    <option [ngValue]="d.id">{{ d.name }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Chức vụ</label>
                <input type="text" [(ngModel)]="empForm.position" name="pos" placeholder="VD: Trưởng ca, Công nhân...">
              </div>
              <div class="form-group">
                <label>Mã máy chấm công (Enroll ID)</label>
                <input type="text" [(ngModel)]="empForm.enrollNumber" name="enroll" placeholder="VD: 101, 102...">
              </div>
              <div class="form-group">
                <label>Số điện thoại</label>
                <input type="text" [(ngModel)]="empForm.phone" name="phone">
              </div>
              <div class="form-group">
                <label>Ngày vào làm</label>
                <input type="date" [(ngModel)]="empForm.joinDate" name="joinDate">
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-ghost" (click)="showEmpModal = false">Hủy</button>
                <button type="submit" class="btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Department Modal -->
      @if (showDeptModal) {
        <div class="modal-backdrop" (click)="showDeptModal = false">
          <div class="modal-card small" (click)="$event.stopPropagation()">
            <h3>{{ editingDept?.id ? 'Sửa bộ phận' : 'Thêm bộ phận' }}</h3>
            <form (submit)="saveDept($event)">
              <div class="form-group">
                <label>Tên bộ phận *</label>
                <input type="text" [(ngModel)]="deptForm.name" name="name" required>
              </div>
              <div class="form-group">
                <label>Mô tả</label>
                <input type="text" [(ngModel)]="deptForm.description" name="desc">
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-ghost" (click)="showDeptModal = false">Hủy</button>
                <button type="submit" class="btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Shift Modal -->
      @if (showShiftModal) {
        <div class="modal-backdrop" (click)="showShiftModal = false">
          <div class="modal-card small" (click)="$event.stopPropagation()">
            <h3>{{ editingShift?.id ? 'Sửa ca' : 'Thêm ca' }}</h3>
            <form (submit)="saveShift($event)">
              <div class="form-group">
                <label>Tên ca *</label>
                <input type="text" [(ngModel)]="shiftForm.name" name="name" required placeholder="Ca sáng">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Bắt đầu</label>
                  <input type="time" [(ngModel)]="shiftForm.startTime" name="start" required>
                </div>
                <div class="form-group">
                  <label>Kết thúc</label>
                  <input type="time" [(ngModel)]="shiftForm.endTime" name="end" required>
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-ghost" (click)="showShiftModal = false">Hủy</button>
                <button type="submit" class="btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Machine Modal -->
      @if (showMachineModal) {
        <div class="modal-backdrop" (click)="showMachineModal = false">
          <div class="modal-card small" (click)="$event.stopPropagation()">
            <h3>{{ editingMachine?.id ? 'Sửa máy' : 'Thêm máy chấm công' }}</h3>
            <form (submit)="saveMachine($event)">
              <div class="form-group">
                <label>Tên máy *</label>
                <input type="text" [(ngModel)]="machineForm.name" name="name" required placeholder="Máy 1">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Địa chỉ IP</label>
                  <input type="text" [(ngModel)]="machineForm.ip" name="ip" required placeholder="222.252.1.214">
                </div>
                <div class="form-group">
                  <label>Port</label>
                  <input type="number" [(ngModel)]="machineForm.port" name="port" required>
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-ghost" (click)="showMachineModal = false">Hủy</button>
                <button type="submit" class="btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
    styles: [`
    .hr-container { padding: 1.5rem; max-width: 1400px; margin: 0 auto; animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .header h1 { margin: 0; font-size: 1.8rem; }
    .header-actions { display: flex; gap: 0.5rem; }

    .btn-success { background: #27ae60; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .btn-warning { background: #e74c3c; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .btn-success:hover, .btn-warning:hover { filter: brightness(1.1); transform: translateY(-1px); }

    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; }
    .tabs button { background: none; border: none; color: #888; padding: 0.6rem 1.2rem; border-radius: 8px 8px 0 0; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
    .tabs button.active { color: white; background: rgba(255,255,255,0.08); border-bottom: 2px solid #e74c3c; }

    .tab-content { animation: fadeIn 0.2s ease; }
    .filters-row { display: flex; gap: 1rem; margin-bottom: 1rem; align-items: center; }
    .search-box { flex: 1; position: relative; }
    .search-box span { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); }
    .search-box input { width: 100%; padding: 0.6rem 1rem 0.6rem 2.5rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; }
    .filters-row select { padding: 0.6rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; min-width: 160px; }

    .mode-toggle { display: flex; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); height: fit-content; }
    .mode-toggle button { background: none; border: none; color: #888; padding: 0.5rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; white-space: nowrap; }
    .mode-toggle button.active { background: #e74c3c; color: white; box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3); }
    .mode-toggle button:not(.active):hover { color: white; background: rgba(255,255,255,0.05); }

    .table-wrap { background: var(--card-bg, #1a1a2e); border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
    .table-wrap.small td { padding: 0.5rem 0.8rem; font-size: 0.8rem; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 0.8rem 1rem; text-align: left; background: rgba(255,255,255,0.03); font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 1px; }
    td { padding: 0.7rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; }
    tr:hover { background: rgba(255,255,255,0.02); }
    tr.selected { background: rgba(231, 76, 60, 0.1); border-left: 4px solid #e74c3c; }
    .bold { font-weight: 600; }
    .empty { text-align: center; color: #555; padding: 2rem; }

    .badge { padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.75rem; }
    .badge.dept { background: rgba(52,152,219,0.15); color: #3498db; }
    .badge.active { background: rgba(39,174,96,0.15); color: #27ae60; }
    .badge.inactive { background: rgba(231,76,60,0.15); color: #e74c3c; }
    .badge.warning { background: rgba(243,156,18,0.15); color: #f39c12; }
    .text-green { color: #27ae60; font-weight: 600; }
    .text-yellow { color: #f39c12; font-weight: 600; }
    .text-red { color: #e74c3c; font-weight: 600; }
    .text-blue { color: #3498db; font-weight: 600; }

    .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .settings-card { background: var(--card-bg, #1a1a2e); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); padding: 1.5rem; }
    .settings-card.full-width { grid-column: 1 / -1; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .card-header h3 { margin: 0; font-size: 1.1rem; }
    
    .setting-item { display: flex; justify-content: space-between; align-items: center; padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .setting-item:last-child { border-bottom: none; }
    .setting-item strong { display: block; font-size: 0.95rem; }
    .setting-item .sub { display: block; font-size: 0.8rem; color: #666; margin-top: 2px; }
    .setting-item .last-sync { color: #555; }
    .item-actions { display: flex; gap: 0.4rem; align-items: center; }
    
    .btn-sm { background: #e74c3c; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; transition: all 0.2s; }
    .btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sm:not(:disabled):hover { filter: brightness(1.1); transform: translateY(-1px); }
    .btn-icon { background: none; border: none; color: #888; cursor: pointer; padding: 0.3rem; border-radius: 4px; font-size: 1rem; transition: all 0.2s; }
    .btn-icon:hover { background: rgba(255,255,255,0.1); color: white; }
    
    .stats-overview { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .stat-box.premium { background: linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; padding: 1.5rem; border-radius: 20px; gap: 1.2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
    .stat-icon { width: 50px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
    .stat-icon.red { background: rgba(231,76,60,0.15); color: #e74c3c; }
    .stat-icon.yellow { background: rgba(243,156,18,0.15); color: #f39c12; }
    .stat-icon.blue { background: rgba(52,152,219,0.15); color: #3498db; }
    .stat-content { display: flex; flex-direction: column; }
    .st-val { font-size: 2rem; font-weight: 800; line-height: 1; }
    .st-lbl { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }

    .report-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 1.5rem; }
    .right-col { display: flex; flex-direction: column; gap: 1.5rem; }
    .report-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 1.5rem; }
    .animate-in { animation: slideIn 0.3s ease-out; }
    @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: none; } }
    .mb-4 { margin-bottom: 1.5rem; }

    .dept-chart { display: flex; flex-direction: column; gap: 1.2rem; }
    .dept-bar-row { display: flex; flex-direction: column; gap: 0.4rem; }
    .dept-info { display: flex; justify-content: space-between; font-size: 0.85rem; }
    .dept-name { color: #ccc; }
    .dept-count { font-weight: 700; color: #fff; }
    .bar-container { background: rgba(255,255,255,0.05); height: 8px; border-radius: 4px; overflow: hidden; }
    .bar { background: linear-gradient(90deg, #e74c3c, #f39c12); height: 100%; border-radius: 4px; }

    .empty-detail { display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.01); border: 2px dashed rgba(255,255,255,0.05); min-height: 200px; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-card { background: #1a1a2e; width: 500px; border-radius: 16px; padding: 2rem; border: 1px solid rgba(255,255,255,0.15); }
    .modal-card.small { width: 400px; }
    .modal-card h3 { margin: 0 0 0.5rem; border-left: 4px solid #e74c3c; padding-left: 1rem; }
    .modal-sub { color: #888; margin: 0 0 1.5rem; padding-left: 1.3rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 1rem; }
    .form-group label { font-size: 0.8rem; color: #818cf8; }
    .form-group input, .form-group select { padding: 0.6rem 1rem; border-radius: 8px; border: 1px solid rgba(81,140,248,0.2); background: rgba(81,140,248,0.05); color: white; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; }
    .btn-primary { background: #e74c3c; color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .btn-ghost { background: none; border: 1px solid rgba(255,255,255,0.2); color: #888; padding: 0.6rem 1.5rem; border-radius: 8px; cursor: pointer; }
    
    .modal-lg { width: 800px !important; }
    .table-wrap { background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
    .mapped { background: rgba(39,174,96,0.05); }
    .badge-success { background: rgba(39,174,96,0.15); color: #27ae60; border: 1px solid rgba(39,174,96,0.2); }
    .btn-success { background: #27ae60 !important; color: white !important; }

    @media (max-width: 768px) {
      .settings-grid { grid-template-columns: 1fr; }
      .filters-row { flex-direction: column; }
      .header { flex-direction: column; gap: 1rem; align-items: flex-start; }
    }
  `],
})
export class HrComponent implements OnInit {
    activeTab = 'employees';
    departments = signal<Department[]>([]);
    shifts = signal<Shift[]>([]);
    machines = signal<any[]>([]);
    employees = signal<Employee[]>([]);
    summary = signal<AttendanceSummary[]>([]);
    details = signal<any[]>([]);
    attMode = signal<'summary' | 'detail'>('summary');
    syncing = signal(false);
    violationReport = signal<any>(null);
    selectedViolator = signal<any>(null);
    showMachineUsersModal = false;
    machineUsersName = '';
    machineUsersList = signal<any[]>([]);

    private auth = inject(AuthService);
    isAdmin = this.auth.isAdmin;
    isManager = this.auth.isManager;
    isWorker = this.auth.isWorker;
    currentUser = this.auth.user;

    empSearch = '';
    empDeptFilter: number | undefined;
    attMonth = new Date().getMonth() + 1;
    attYear = new Date().getFullYear();

    months = [
        { v: 1, label: 'Tháng 1' }, { v: 2, label: 'Tháng 2' }, { v: 3, label: 'Tháng 3' },
        { v: 4, label: 'Tháng 4' }, { v: 5, label: 'Tháng 5' }, { v: 6, label: 'Tháng 6' },
        { v: 7, label: 'Tháng 7' }, { v: 8, label: 'Tháng 8' }, { v: 9, label: 'Tháng 9' },
        { v: 10, label: 'Tháng 10' }, { v: 11, label: 'Tháng 11' }, { v: 12, label: 'Tháng 12' },
    ];

    // Modals
    showEmpModal = false; showDeptModal = false; showShiftModal = false;
    editingEmp: Employee | null = null;
    editingDept: Department | null = null;
    editingShift: Shift | null = null;
    empForm: any = {};
    deptForm: any = {};
    shiftForm: any = {};

    constructor(private hrService: HrService) { }

    ngOnInit() {
        if (this.isWorker()) {
            this.activeTab = 'attendance';
            this.attMode.set('detail');
        }
        this.loadDepartments();
        this.loadShifts();
        this.loadMachines();
        this.loadAttendance();
        if (this.isAdmin() || this.isManager()) {
            this.loadEmployees();
        }
    }

    loadDepartments() { this.hrService.getDepartments().subscribe(r => this.departments.set(r.data)); }
    loadShifts() { this.hrService.getShifts().subscribe(r => this.shifts.set(r.data)); }
    loadMachines() { this.hrService.getMachines().subscribe(r => this.machines.set(r.data)); }

    loadMachineUsers(machineId: number, machineName: string) {
        this.machineUsersName = machineName;
        this.syncing.set(true);
        this.hrService.getMachineUsers(machineId).subscribe({
            next: (res: any) => {
                this.syncing.set(false);
                this.machineUsersList.set(res.data.users.map((u: any) => ({
                    ...u,
                    selectedUserId: 0,
                    mappedName: u.mapped ? this.getMappedName(u.id) : null
                })));
                this.showMachineUsersModal = true;
            },
            error: (e) => {
                this.syncing.set(false);
                alert('❌ Lỗi kết nối máy: ' + (e.error?.message || e.message));
            }
        });
    }

    private getMappedName(enrollId: string): string | null {
        const emp = this.employees().find(e => e.enrollNumber === enrollId.toString());
        return emp ? emp.fullName : null;
    }

    mapMachineUser(mu: any) {
        if (!mu.selectedUserId) return;
        const emp = this.employees().find(e => e.id === mu.selectedUserId);
        if (!emp) return;

        this.syncing.set(true);
        this.hrService.updateEmployee(emp.id, { enrollNumber: mu.id.toString() }).subscribe({
            next: () => {
                this.syncing.set(false);
                mu.mappedName = emp.fullName;
                this.loadEmployees();
            },
            error: (e) => {
                this.syncing.set(false);
                alert('❌ Lỗi gán ID: ' + (e.error?.message || e.message));
            }
        });
    }
    loadEmployees() {
        const search = this.empSearch?.trim();
        this.hrService.getEmployees({ departmentId: this.empDeptFilter, search })
            .subscribe(r => this.employees.set(r.data));
    }
    loadAttendance() {
        if (this.attMode() === 'summary') this.loadSummary();
        else this.loadDetails();
    }
    loadSummary() {
        this.hrService.getAttendanceSummary(this.attMonth, this.attYear)
            .subscribe(r => {
                let data = r.data;
                if (this.isWorker()) {
                    data = data.filter(s => s.userId === this.currentUser()?.id);
                }
                this.summary.set(data);
            });
    }
    loadDetails() {
        const userId = this.isWorker() ? this.currentUser()?.id : undefined;
        this.hrService.getAttendance(this.attMonth, this.attYear, userId)
            .subscribe(r => this.details.set(r.data));
    }

    loadViolationReport() {
        this.syncing.set(true);
        this.selectedViolator.set(null);
        this.hrService.getViolationReport(this.attMonth, this.attYear).subscribe({
            next: r => {
                this.violationReport.set(r.data);
                this.syncing.set(false);
            },
            error: e => {
                this.syncing.set(false);
                alert('Lỗi tải báo cáo: ' + (e.error?.message || e.message));
            }
        });
    }
    setAttMode(mode: 'summary' | 'detail') {
        this.attMode.set(mode);
        this.loadAttendance();
    }

    // Check-in / Check-out
    doCheckIn() {
        this.hrService.checkIn().subscribe({
            next: () => alert('✅ Check-in thành công!'),
            error: (e) => alert(e.error?.message || 'Lỗi check-in'),
        });
    }
    doCheckOut() {
        this.hrService.checkOut().subscribe({
            next: () => alert('✅ Check-out thành công!'),
            error: (e) => alert(e.error?.message || 'Lỗi check-out'),
        });
    }

    // Employee modal
    openEmpModal(e: any) {
        this.editingEmp = e;
        this.empForm = { 
            departmentId: e.departmentId, 
            position: e.position || '', 
            phone: e.phone || '', 
            joinDate: e.joinDate?.split('T')[0] || '',
            enrollNumber: e.enrollNumber || ''
        };
        this.showEmpModal = true;
    }
    saveEmployee(ev: Event) {
        ev.preventDefault();
        if (!this.editingEmp) return;
        this.hrService.updateEmployee(this.editingEmp.id, this.empForm).subscribe({
            next: () => { this.showEmpModal = false; this.loadEmployees(); },
            error: (e) => alert(e.error?.message || 'Lỗi cập nhật'),
        });
    }

    deleteEmployee(e: Employee) {
        if (!confirm(`Xác nhận xóa nhân viên "${e.fullName}"? \nLưu ý: Nếu nhân viên đã có dữ liệu chấm công, hệ thống sẽ chuyển sang trạng thái "Nghỉ việc" thay vì xóa hẳn.`)) return;
        this.hrService.deleteEmployee(e.id).subscribe({
            next: () => this.loadEmployees(),
            error: (err) => alert('Lỗi: ' + (err.error?.message || err.message))
        });
    }

    // Helper calculations for detailed view
    isLate(r: any): boolean {
        return this.getLateMinutes(r) > 0;
    }

    getLateMinutes(r: any): number {
        if (!r.checkIn) return 0;
        
        // Default rule or from Shift
        let startHour = 8;
        let startMin = 0;
        
        if (r.shift?.startTime) {
            [startHour, startMin] = r.shift.startTime.split(':').map(Number);
        } else if (r.note?.includes('SX')) {
            startHour = 7;
        } else if (r.note?.includes('VP')) {
            startHour = 8;
        }

        const checkIn = new Date(r.checkIn);
        const lateMs = (checkIn.getHours() * 60 + checkIn.getMinutes()) - (startHour * 60 + startMin);
        return lateMs > 0 ? lateMs : 0;
    }

    getEarlyMinutes(r: any): number {
        if (!r.checkOut) return 0;
        
        let endHour = 17;
        let endMin = 0;

        if (r.shift?.endTime) {
            [endHour, endMin] = r.shift.endTime.split(':').map(Number);
        } else if (r.note?.includes('SX')) {
            endHour = 16;
        } else if (r.note?.includes('VP')) {
            endHour = 17;
        }

        const checkOut = new Date(r.checkOut);
        const earlyMs = (endHour * 60 + endMin) - (checkOut.getHours() * 60 + checkOut.getMinutes());
        return earlyMs > 0 ? earlyMs : 0;
    }

    calculateWorkHours(r: any): string {
        if (!r.checkIn || !r.checkOut) return '0';
        const ms = new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime();
        return (ms / (1000 * 60 * 60)).toFixed(1);
    }

    openAttModal(r: any) {
        // Implement attendance editing if needed
        alert('Tính năng chỉnh sửa chấm công chi tiết đang được cập nhật');
    }

    // Department modal
    openDeptModal(d?: Department) {
        this.editingDept = d || null;
        this.deptForm = d ? { ...d } : { name: '', description: '' };
        this.showDeptModal = true;
    }
    saveDept(ev: Event) {
        ev.preventDefault();
        const req = this.editingDept?.id
            ? this.hrService.updateDepartment(this.editingDept.id, this.deptForm)
            : this.hrService.createDepartment(this.deptForm);
        req.subscribe({ next: () => { this.showDeptModal = false; this.loadDepartments(); }, error: (e) => alert(e.error?.message || 'Lỗi') });
    }
    deleteDept(id: number) {
        if (!confirm('Xóa bộ phận này?')) return;
        this.hrService.deleteDepartment(id).subscribe(() => this.loadDepartments());
    }

    // Shift modal
    openShiftModal(s?: Shift) {
        this.editingShift = s || null;
        this.shiftForm = s ? { ...s } : { name: '', startTime: '06:00', endTime: '14:00' };
        this.showShiftModal = true;
    }
    saveShift(ev: Event) {
        ev.preventDefault();
        const req = this.editingShift?.id
            ? this.hrService.updateShift(this.editingShift.id, this.shiftForm)
            : this.hrService.createShift(this.shiftForm);
        req.subscribe({ next: () => { this.showShiftModal = false; this.loadShifts(); }, error: (e) => alert(e.error?.message || 'Lỗi') });
    }
    deleteShift(id: number) {
        if (!confirm('Xóa ca này?')) return;
        this.hrService.deleteShift(id).subscribe(() => this.loadShifts());
    }

    // Machine Modal
    showMachineModal = false;
    editingMachine: any = null;
    machineForm: any = {};
    openMachineModal(m?: any) {
        this.editingMachine = m || null;
        this.machineForm = m ? { ...m } : { name: '', ip: '', port: 4370, isActive: true };
        this.showMachineModal = true;
    }
    saveMachine(ev: Event) {
        ev.preventDefault();
        this.hrService.saveMachine(this.machineForm).subscribe({
            next: () => { this.showMachineModal = false; this.loadMachines(); },
            error: (e) => alert(e.error?.message || 'Lỗi')
        });
    }
    deleteMachine(id: number) {
        if (!confirm('Xóa máy này?')) return;
        this.hrService.deleteMachine(id).subscribe(() => this.loadMachines());
    }
    autoMapUsers() {
        if (!confirm('Hệ thống sẽ tự động so khớp TÊN nhân viên trên máy chấm công với TÊN trong phần mềm để gán Enroll ID. Tiếp tục?')) return;
        this.syncing.set(true);
        this.hrService.autoMapUsers().subscribe({
            next: (res: any) => {
                this.syncing.set(false);
                const mapped = res.data?.mapped || 0;
                alert(`✅ Đã tự động gán ${mapped} nhân viên.\n\nSau khi gán xong, hãy nhấn "Đồng bộ dữ liệu" để lấy dữ liệu chấm công.`);
                this.loadEmployees();
            },
            error: (e) => {
                this.syncing.set(false);
                alert('❌ Lỗi: ' + (e.error?.message || e.message));
            }
        });
    }

    syncMachines() {
        this.syncing.set(true);
        this.hrService.syncMachines().subscribe({
            next: (res: any) => {
                this.syncing.set(false);
                const results = res.data || [];
                let msg = '📊 Kết quả đồng bộ:\n\n';
                for (const r of results) {
                    if (r.success) {
                        msg += `✅ ${r.machine}: ${r.synced} bản ghi mới, ${r.skipped} bỏ qua (tổng ${r.totalLogs} log, ${r.uniqueUserIds} user ID trên máy)\n`;
                    } else {
                        msg += `❌ ${r.machine}: ${r.error}\n`;
                    }
                }
                if (results.length === 0) msg += 'Không có máy nào được cấu hình.';
                alert(msg);
                this.loadAttendance();
                this.loadMachines();
            },
            error: (e) => {
                this.syncing.set(false);
                alert('❌ Lỗi đồng bộ: ' + (e.error?.message || e.message));
            }
        });
    }
}
