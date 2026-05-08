/**
 * HR Module — Shared Utilities
 * Centralized timezone helpers and attendance threshold constants.
 */

// ─── Timezone ────────────────────────────────────────────────

export const TZ = 'Asia/Ho_Chi_Minh';

/** Pre-built formatters — reuse to avoid expensive Intl constructor calls */
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

const dateStrFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });

/** Returns YYYY-MM-DD in VN timezone */
export function toVnDateStr(d: Date): string {
    return dateStrFormatter.format(d);
}

/** Returns HH:MM:SS in VN timezone */
export function toVnTimeStr(d: Date): string {
    const parts = timeFormatter.formatToParts(d);
    const h = parts.find(p => p.type === 'hour')?.value || '00';
    const m = parts.find(p => p.type === 'minute')?.value || '00';
    const s = parts.find(p => p.type === 'second')?.value || '00';
    return `${h}:${m}:${s}`;
}

/** Returns { dateOnlyStr: 'YYYY-MM-DD', dateOnly: Date(UTC midnight), timeStr: 'HH:MM:SS' } */
export function parseVnDateTime(d: Date): { dateOnlyStr: string; dateOnly: Date; timeStr: string } {
    const dateParts = dateFormatter.formatToParts(d);
    const y = dateParts.find(p => p.type === 'year')?.value;
    const m = dateParts.find(p => p.type === 'month')?.value;
    const day = dateParts.find(p => p.type === 'day')?.value;
    const dateOnlyStr = `${y}-${m}-${day}`;
    const dateOnly = new Date(`${dateOnlyStr}T00:00:00Z`);
    const timeStr = toVnTimeStr(d);
    return { dateOnlyStr, dateOnly, timeStr };
}

/** Returns today's date at UTC midnight, based on VN timezone */
export function getVnToday(): Date {
    const str = toVnDateStr(new Date());
    return new Date(`${str}T00:00:00Z`);
}

/** Returns a UTC date range for a given month in VN timezone */
export function getMonthDateRange(month: number, year: number): { start: Date; end: Date } {
    const mm = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const dd = String(lastDay).padStart(2, '0');
    return {
        start: new Date(`${year}-${mm}-01T00:00:00Z`),
        end: new Date(`${year}-${mm}-${dd}T23:59:59Z`),
    };
}

// ─── Attendance Thresholds ───────────────────────────────────

interface MachineThresholds {
    checkInLimit: string;   // e.g. '08:01:00' — late if >= this
    checkOutLimit: string;  // e.g. '17:00:00' — early if < this
    shiftStart: string;     // e.g. '08:00:00' — for late-minutes calc
}

const THRESHOLDS: Record<string, MachineThresholds> = {
    VP: { checkInLimit: '08:01:00', checkOutLimit: '17:00:00', shiftStart: '08:00:00' },
    SX: { checkInLimit: '07:01:00', checkOutLimit: '16:00:00', shiftStart: '07:00:00' },
};

/** Get threshold config for a machine name, defaults to VP */
export function getThresholds(machineName: string): MachineThresholds {
    if (machineName.includes('SX')) return THRESHOLDS.SX;
    return THRESHOLDS.VP;
}

// ─── Device User ID Extraction ───────────────────────────────

/** Safely extract the device user ID from a ZKTeco log entry */
export function extractDeviceUserId(log: Record<string, unknown>): string {
    return ((log.user_id || log.deviceUserId || log.userSn || log.userId || log.uid || '') as string)
        .toString().trim();
}

/** Safely extract the log timestamp from a ZKTeco log entry */
export function extractLogDate(log: Record<string, unknown>): Date | null {
    const raw = (log.record_time || log.recordTime) as string | Date | undefined;
    if (!raw) return null;
    const d = new Date(raw as string);
    return isNaN(d.getTime()) ? null : d;
}
