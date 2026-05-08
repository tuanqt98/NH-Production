import { Component, OnInit, signal, inject, computed, HostListener } from '@angular/core';
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
                  <button class="btn-sm" (click)="$event.stopPropagation(); loadMachineUsers(m.id, m.name)">👥 Gán ID</button>
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
            <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between;">
              <h3 style="margin:0">👥 Gán nhân viên - Máy {{ machineUsersName }}</h3>
              <div class="modal-search" style="flex: 1; max-width: 300px; margin: 0 1.5rem;">
                <input type="text" placeholder="Tìm tên nhân viên..." 
                       [ngModel]="modalEmpSearch()" (ngModelChange)="modalEmpSearch.set($event)"
                       style="width: 100%; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: white; font-size: 0.9rem;">
              </div>
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
                          <div class="flex items-center gap-2">
                            <span class="badge badge-success">✅ {{ mu.mappedName }}</span>
                            <button class="btn-icon" (click)="$event.stopPropagation(); unmapUser(mu)" title="Thay đổi">✏️</button>
                          </div>
                        } @else {
                        <div class="searchable-dropdown" [class.active]="activeRowUid() === mu.uid">
                          <div class="dropdown-trigger" (click)="activeRowUid.set(mu.uid); modalEmpSearch.set('')">
                            <span [style.color]="mu.selectedUserId > 0 ? '#fff' : '#888'">
                              {{ getEmpName(mu.selectedUserId) || '-- Chọn nhân viên --' }}
                            </span>
                            @if (!mu.mappedName && mu.suggestion) {
                              <span class="badge warning" style="margin-left: 8px; font-size: 0.65rem;">Gợi ý: {{ mu.suggestion.fullName }}</span>
                            }
                            <span class="chevron">▼</span>
                          </div>
                          
                          @if (activeRowUid() === mu.uid) {
                            <div class="dropdown-panel" (click)="$event.stopPropagation()">
                              <input type="text" placeholder="Tìm tên..." #sInput
                                     [ngModel]="modalEmpSearch()" (ngModelChange)="modalEmpSearch.set($event)"
                                     (keydown.esc)="activeRowUid.set(null)"
                                     (keydown.enter)="selectFirstFiltered(mu)">
                              <div class="options-list">
                                <div class="option-item" (click)="selectEmployeeInDropdown(mu, 0)">-- Không chọn --</div>
                                @for (e of allEmployees(); track e.id) {
                                  @if (!modalEmpSearch() || e.fullName.toLowerCase().includes(modalEmpSearch().toLowerCase())) {
                                    <div class="option-item" [class.selected]="e.id === mu.selectedUserId"
                                         (click)="selectEmployeeInDropdown(mu, e.id)">
                                      {{ e.fullName }}
                                    </div>
                                  }
                                }
                                @if (modalEmpSearch() && !hasFilteredResults()) {
                                  <div class="option-item empty">Không tìm thấy</div>
                                }
                              </div>
                            </div>
                          }
                        </div>
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
    styleUrls: ['./hr.component.css'],
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
    allEmployees = signal<Employee[]>([]);
    modalEmpSearch = signal('');
    activeRowUid = signal<number | null>(null);

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        if (!this.showMachineUsersModal) return;
        if (!(event.target as HTMLElement).closest('.searchable-dropdown')) {
            this.activeRowUid.set(null);
        }
    }

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
            this.hrService.getEmployees().subscribe(r => this.allEmployees.set(r.data));
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
                    selectedUserId: u.suggestion?.id || 0,
                    mappedName: u.mapped ? this.getMappedName(u.id) : null
                })));
                setTimeout(() => {
                    this.showMachineUsersModal = true;
                    this.modalEmpSearch.set('');
                }, 50);
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

    getEmpName(id: number): string {
        if (!id) return '';
        const emp = this.allEmployees().find(e => e.id === id);
        return emp ? emp.fullName : '';
    }

    selectEmployeeInDropdown(mu: any, empId: number) {
        mu.selectedUserId = empId;
        this.activeRowUid.set(null);
    }

    unmapUser(mu: any) {
        const empId = this.allEmployees().find(e => e.enrollNumber === mu.id.toString())?.id;
        if (empId) {
            // Native confirm can sometimes cause flicker in certain Angular/Browser combinations
            // For now, let's do it directly to verify if this is the cause of flickering
            this.syncing.set(true);
            this.hrService.updateEmployee(empId, { enrollNumber: null }).subscribe({
                next: () => {
                    this.syncing.set(false);
                    mu.mappedName = null;
                    mu.selectedUserId = 0;
                    this.loadEmployees();
                },
                error: (e) => {
                    this.syncing.set(false);
                    alert('❌ Lỗi hủy gán: ' + (e.error?.message || e.message));
                }
            });
        } else {
            mu.mappedName = null;
            mu.selectedUserId = 0;
        }
    }

    hasFilteredResults(): boolean {
        const term = this.modalEmpSearch().toLowerCase();
        return this.allEmployees().some(e => e.fullName.toLowerCase().includes(term));
    }

    selectFirstFiltered(mu: any) {
        const term = this.modalEmpSearch().toLowerCase();
        const first = this.allEmployees().find(e => e.fullName.toLowerCase().includes(term));
        if (first) this.selectEmployeeInDropdown(mu, first.id);
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
