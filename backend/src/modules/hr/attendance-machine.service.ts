import { prisma } from '../../config/database.config';
import { logger } from '../../config/logger.config';
import { AttendanceStatus } from '@prisma/client';
import {
    toVnDateStr, toVnTimeStr, parseVnDateTime,
    getThresholds, extractDeviceUserId, extractLogDate,
} from './hr.utils';

const ZKLib = require('zkteco-js');

// ─── Types ───────────────────────────────────────────────────

interface ParsedLog {
    userId: number;
    logDate: Date;
    dateOnly: Date;
    dateOnlyStr: string;
    timeStr: string;
}

interface CreateRecord {
    userId: number;
    date: Date;
    checkIn: Date;
    checkOut?: Date;
    status: AttendanceStatus;
    note: string;
}

interface UpdateRecord {
    id: number;
    checkOut: Date;
    status: AttendanceStatus;
}

// ─── Service ─────────────────────────────────────────────────

export class AttendanceMachineService {
    /**
     * Sync logs from all active machines
     */
    async syncAllMachines() {
        const machines = await prisma.attendanceMachine.findMany({
            where: { isActive: true }
        });

        const results = [];
        for (const machine of machines) {
            try {
                const res = await this.syncFromMachine(machine.id);
                results.push({ machine: machine.name, ...res });
            } catch (error: any) {
                logger.error(`Failed to sync machine ${machine.name}: ${error.message}`);
                results.push({ machine: machine.name, success: false, error: error.message });
            }
        }
        return results;
    }

    /**
     * Sync from a specific machine
     */
    async syncFromMachine(machineId: number) {
        const machine = await prisma.attendanceMachine.findUnique({
            where: { id: machineId }
        });

        if (!machine) throw new Error('Machine not found');
        const machineName = machine.name;
        const thresholds = getThresholds(machineName);

        const zk = new ZKLib(machine.ip, machine.port, 10000, 10000);
        
        try {
            logger.info(`Syncing from machine ${machineName} (${machine.ip}:${machine.port})...`);
            await zk.createSocket();
            
            const logs = await zk.getAttendances();
            const totalLogs = logs?.data?.length || 0;
            logger.info(`Fetched ${totalLogs} logs from machine ${machineName}`);
            
            if (!logs?.data || totalLogs === 0) {
                await zk.disconnect();
                return { success: true, synced: 0, skipped: 0, totalLogs: 0 };
            }

            // ── Build user lookup map ────────────────────────────
            const users = await prisma.user.findMany({
                where: { enrollNumber: { not: null } },
                select: { id: true, enrollNumber: true }
            });
            const userMap = new Map(users.map(u => [u.enrollNumber!.trim(), u.id]));

            // ── Parse & filter logs ──────────────────────────────
            let skippedCount = 0;
            const parsedLogs: ParsedLog[] = [];
            const uniqueDateSet = new Set<string>();

            for (const log of logs.data) {
                const logDate = extractLogDate(log);
                if (!logDate) { skippedCount++; continue; }

                const deviceUserId = extractDeviceUserId(log);
                if (!deviceUserId) { skippedCount++; continue; }

                const userId = userMap.get(deviceUserId);
                if (!userId) {
                    // Only warn for recent unmapped logs (last 24h)
                    if (logDate.getTime() > Date.now() - 86_400_000) {
                        logger.warn(`Unmapped machine UID: "${deviceUserId}" at ${logDate.toISOString()}`);
                    }
                    skippedCount++;
                    continue;
                }

                const { dateOnlyStr, dateOnly, timeStr } = parseVnDateTime(logDate);
                parsedLogs.push({ userId, logDate, dateOnly, dateOnlyStr, timeStr });
                uniqueDateSet.add(dateOnly.toISOString());
            }

            // Sort chronologically
            parsedLogs.sort((a, b) => a.logDate.getTime() - b.logDate.getTime());

            // ── Batch fetch existing records ─────────────────────
            const uniqueDates = [...uniqueDateSet].map(d => new Date(d));
            const mappedUserIds = [...new Set(parsedLogs.map(l => l.userId))];

            const existingRecords = await prisma.attendance.findMany({
                where: { userId: { in: mappedUserIds }, date: { in: uniqueDates } },
            });

            // Use VN date string as key to avoid Prisma @db.Date timezone mismatch
            const recordMap = new Map(
                existingRecords.map(r => [`${r.userId}_${toVnDateStr(r.date)}`, r])
            );

            // ── Process logs ─────────────────────────────────────
            let syncedCount = 0;
            const toCreate: CreateRecord[] = [];
            const toUpdate: UpdateRecord[] = [];
            const createKeySet = new Set<string>();       // O(1) duplicate check
            const createMap = new Map<string, CreateRecord>(); // O(1) lookup for checkout updates

            for (const { userId, logDate, dateOnly, dateOnlyStr, timeStr } of parsedLogs) {
                const key = `${userId}_${dateOnlyStr}`;
                const existing = recordMap.get(key);

                if (!existing) {
                    if (!createKeySet.has(key)) {
                        // First log for this user+date → create check-in
                        const status = this.getCheckInStatus(timeStr, thresholds);
                        const newRecord: CreateRecord = {
                            userId, date: dateOnly, checkIn: logDate,
                            status, note: `Máy: ${machineName}`,
                        };
                        toCreate.push(newRecord);
                        createKeySet.add(key);
                        createMap.set(key, newRecord);
                        recordMap.set(key, { id: -1, ...newRecord } as any);
                        syncedCount++;
                    } else {
                        // Subsequent log → update checkout on the queued create record
                        const createItem = createMap.get(key)!;
                        if (logDate.getTime() > createItem.checkIn.getTime()) {
                            createItem.checkOut = logDate;
                            createItem.status = this.getCheckOutStatus(
                                createItem.checkIn, timeStr, thresholds
                            );
                        }
                    }
                } else {
                    // Record exists in DB or was just created
                    if (existing.checkIn && logDate.getTime() === existing.checkIn.getTime()) {
                        skippedCount++;
                        continue;
                    }

                    const currentOut = existing.checkOut ?? existing.checkIn ?? null;
                    const shouldUpdate = currentOut === null || logDate.getTime() > currentOut.getTime();

                    if (shouldUpdate) {
                        const newStatus = this.getCheckOutStatus(
                            existing.checkIn!, timeStr, thresholds
                        );

                        if (existing.id === -1) {
                            // Update the queued create record
                            const createItem = createMap.get(key);
                            if (createItem) {
                                createItem.checkOut = logDate;
                                createItem.status = newStatus;
                            }
                        } else {
                            // Queue DB update (batched later)
                            toUpdate.push({ id: existing.id, checkOut: logDate, status: newStatus });
                        }
                        recordMap.set(key, { ...existing, checkOut: logDate, status: newStatus } as any);
                        syncedCount++;
                    } else {
                        skippedCount++;
                    }
                }
            }

            // ── Batch write ──────────────────────────────────────
            await prisma.$transaction([
                ...(toCreate.length > 0
                    ? [prisma.attendance.createMany({ data: toCreate, skipDuplicates: true })]
                    : []),
                ...toUpdate.map(u =>
                    prisma.attendance.update({
                        where: { id: u.id },
                        data: { checkOut: u.checkOut, status: u.status },
                    })
                ),
            ]);

            if (toCreate.length > 0) {
                logger.info(`Batch created ${toCreate.length} records for ${machineName}`);
            }
            if (toUpdate.length > 0) {
                logger.info(`Batch updated ${toUpdate.length} records for ${machineName}`);
            }

            await prisma.attendanceMachine.update({
                where: { id: machineId },
                data: { lastSync: new Date() }
            });

            await zk.disconnect();
            logger.info(`Sync complete for ${machineName}: synced=${syncedCount}, skipped=${skippedCount}`);
            
            return { success: true, synced: syncedCount, skipped: skippedCount, totalLogs: totalLogs };
        } catch (error: any) {
            try { await zk.disconnect(); } catch (_) {}
            throw error;
        }
    }

    // ─── Status Helpers (pure, no side effects) ──────────────

    private getCheckInStatus(timeStr: string, thresholds: { checkInLimit: string }): AttendanceStatus {
        return timeStr >= thresholds.checkInLimit ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
    }

    private getCheckOutStatus(
        checkInTime: Date, checkOutTimeStr: string,
        thresholds: { checkInLimit: string; checkOutLimit: string }
    ): AttendanceStatus {
        // If they checked in late, status stays LATE regardless of checkout
        const checkInTimeStr = toVnTimeStr(checkInTime);
        if (checkInTimeStr >= thresholds.checkInLimit) return AttendanceStatus.LATE;

        // If they left early, that's also LATE
        if (checkOutTimeStr < thresholds.checkOutLimit) return AttendanceStatus.LATE;

        return AttendanceStatus.PRESENT;
    }

    // ─── Machine CRUD ────────────────────────────────────────

    async saveMachine(data: any) {
        if (data.id) {
            return prisma.attendanceMachine.update({ where: { id: data.id }, data });
        }
        return prisma.attendanceMachine.create({ data });
    }

    async getMachines() {
        return prisma.attendanceMachine.findMany();
    }

    async getMachineUsers(machineId: number) {
        const machine = await prisma.attendanceMachine.findUnique({
            where: { id: machineId }
        });
        if (!machine) throw new Error('Machine not found');

        const zk = new ZKLib(machine.ip, machine.port, 10000, 10000);
        try {
            await zk.createSocket();
            const result = await zk.getUsers();
            await zk.disconnect();
            
            const machineUsers = (result?.data || []).map((u: any) => ({
                uid: u.uid,
                id: (u.userId || u.user_id || u.uid || '').toString(),
                name: u.name || u.userName || '',
                role: u.role,
                cardno: u.cardno,
            }));

            const dbUsers = await prisma.user.findMany({
                select: { id: true, fullName: true, enrollNumber: true, username: true }
            });
            
            const mappedByEnroll = new Map(
                dbUsers.filter(u => u.enrollNumber).map(u => [u.enrollNumber, u])
            );
            
            return {
                machineName: machine.name,
                users: machineUsers.map((mu: any) => {
                    const dbUser = mappedByEnroll.get(mu.id);
                    let suggestion = null;

                    if (!dbUser && mu.name) {
                        const normName = mu.name.toLowerCase().trim();
                        suggestion = dbUsers.find(du => 
                            du.fullName.toLowerCase().includes(normName) || 
                            normName.includes(du.fullName.toLowerCase())
                        );
                    }

                    return {
                        ...mu,
                        mapped: !!dbUser,
                        dbUser: dbUser || null,
                        suggestion: suggestion ? { id: suggestion.id, fullName: suggestion.fullName } : null
                    };
                })
            };
        } catch (error: any) {
            try { await zk.disconnect(); } catch (_) {}
            throw new Error(
                `Không thể kết nối tới máy chấm công (${machine.ip}:${machine.port}). Vui lòng kiểm tra lại đường truyền hoặc IP của máy.`
            );
        }
    }

    async deleteMachine(id: number) {
        return prisma.attendanceMachine.delete({ where: { id } });
    }

    // ─── Auto-map machine users to DB users ──────────────────

    async autoMapUsers(): Promise<number> {
        const removeDiacritics = (str: string) =>
            str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').trim().toLowerCase();

        const machines = await this.getMachines();
        let totalMapped = 0;

        for (const machine of machines) {
            try {
                const result = await this.getMachineUsers(machine.id);
                const dbUsers = await prisma.user.findMany({
                    where: { isActive: true, enrollNumber: null },
                    select: { id: true, fullName: true }
                });

                logger.info(`Auto-map: Machine ${machine.name} has ${result.users.length} users, DB has ${dbUsers.length} unmapped users`);

                for (const mu of result.users) {
                    if (!mu.name || mu.mapped) continue;
                    const muNorm = removeDiacritics(mu.name);

                    const match = dbUsers.find(u => removeDiacritics(u.fullName) === muNorm);
                    if (match) {
                        await prisma.user.update({
                            where: { id: match.id },
                            data: { enrollNumber: mu.id?.toString() }
                        });
                        logger.info(`Auto-map: "${mu.name}" (ID:${mu.id}) -> "${match.fullName}" (DB:${match.id})`);
                        totalMapped++;
                        // Remove matched user to prevent double-mapping
                        const idx = dbUsers.findIndex(u => u.id === match.id);
                        if (idx >= 0) dbUsers.splice(idx, 1);
                    }
                }
            } catch (e: any) {
                logger.error(`Auto-map error for machine ${machine.name}: ${e.message}`);
            }
        }

        return totalMapped;
    }
}

export const attendanceMachineService = new AttendanceMachineService();
