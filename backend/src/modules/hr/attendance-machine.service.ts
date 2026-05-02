import { prisma } from '../../config/database.config';
const ZKLib = require('zkteco-js');
import { logger } from '../../config/logger.config';
import { AttendanceStatus } from '@prisma/client';

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

        const zk = new ZKLib(machine.ip, machine.port, 5000, 4000);
        
        try {
            logger.info(`Syncing from machine ${machineName} (${machine.ip}:${machine.port})...`);
            // Establish connection
            await zk.createSocket();
            logger.info(`Socket created for sync on ${machineName}`);
            
            // Get attendance logs
            const logs = await zk.getAttendances();
            logger.info(`Fetched ${logs?.data?.length || 0} logs from machine ${machineName}`);
            
            if (logs?.data && logs.data.length > 0) {
                logger.info(`Sample log from ${machineName}: ${JSON.stringify(logs.data[0])}`);
            }

            // Get all users to map enrollNumber
            const users = await prisma.user.findMany({
                where: { enrollNumber: { not: null } },
                select: { id: true, enrollNumber: true }
            });

            const userMap = new Map(users.map(u => [u.enrollNumber, u.id]));
            
            let syncedCount = 0;
            let skippedCount = 0;

            // ── OPTIMIZATION: Pre-process logs to extract unique dates ──
            const parsedLogs: { userId: number; logDate: Date; dateOnly: Date }[] = [];
            const uniqueDateSet = new Set<string>();

            for (const log of logs.data) {
                const deviceUserId = log.user_id || log.deviceUserId || log.userSn || log.uid;
                if (!deviceUserId) continue;

                const userId = userMap.get(deviceUserId.toString());
                if (!userId) { skippedCount++; continue; }

                const logDate = new Date(log.record_time || log.recordTime);
                const dateOnly = new Date(logDate);
                dateOnly.setHours(0, 0, 0, 0);

                parsedLogs.push({ userId, logDate, dateOnly });
                uniqueDateSet.add(dateOnly.toISOString());
            }

            // ── BATCH FETCH: 1 query instead of N queries ──
            const uniqueDates = [...uniqueDateSet].map(d => new Date(d));
            const mappedUserIds = [...new Set(parsedLogs.map(l => l.userId))];

            const existingRecords = await prisma.attendance.findMany({
                where: {
                    userId: { in: mappedUserIds },
                    date: { in: uniqueDates },
                },
            });

            // Build lookup map: "userId_dateISO" -> record
            const recordMap = new Map(
                existingRecords.map(r => [`${r.userId}_${r.date.toISOString()}`, r])
            );

            // Helper: determine check-in status
            const getCheckInStatus = (timeStr: string): AttendanceStatus => {
                if (machineName.includes('VP') && timeStr >= '08:01:00') return AttendanceStatus.LATE;
                if (machineName.includes('SX') && timeStr >= '07:01:00') return AttendanceStatus.LATE;
                return AttendanceStatus.PRESENT;
            };

            // Helper: determine check-out status (early leave)
            const getCheckOutStatus = (existing: AttendanceStatus, outTimeStr: string): AttendanceStatus => {
                if (machineName.includes('VP') && outTimeStr < '17:00:00') return AttendanceStatus.LATE;
                if (machineName.includes('SX') && outTimeStr < '16:00:00') return AttendanceStatus.LATE;
                return existing;
            };

            // Helper: format time string
            const toTimeStr = (d: Date) => 
                `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

            // ── PROCESS: Batch creates, individual updates ──
            const toCreate: { userId: number; date: Date; checkIn: Date; status: AttendanceStatus; note: string }[] = [];

            for (const { userId, logDate, dateOnly } of parsedLogs) {
                const key = `${userId}_${dateOnly.toISOString()}`;
                const existing = recordMap.get(key);
                const timeStr = toTimeStr(logDate);

                if (!existing) {
                    // Check if we already queued a create for this user+date
                    const alreadyQueued = toCreate.find(c => c.userId === userId && c.date.toISOString() === dateOnly.toISOString());
                    if (!alreadyQueued) {
                        const status = getCheckInStatus(timeStr);
                        toCreate.push({ userId, date: dateOnly, checkIn: logDate, status, note: `Máy: ${machineName}` });
                        // Add to map so subsequent logs for same user+date go to update path
                        recordMap.set(key, { id: -1, userId, date: dateOnly, checkIn: logDate, checkOut: null, status, overtimeHours: 0 } as any);
                        syncedCount++;
                    } else {
                        // Later log for same user+date → treat as checkout
                        if (logDate > alreadyQueued.checkIn) {
                            // Will be handled after createMany via update
                        }
                        skippedCount++;
                    }
                } else {
                    // Update check-out if it's later than current check-in
                    if (!existing.checkOut || logDate > existing.checkOut) {
                        if (existing.checkIn && logDate.getTime() === existing.checkIn.getTime()) {
                            skippedCount++;
                            continue;
                        }
                        const newStatus = getCheckOutStatus(existing.status, toTimeStr(logDate));

                        if (existing.id !== -1) {
                            // Real DB record → update directly
                            await prisma.attendance.update({
                                where: { id: existing.id },
                                data: { checkOut: logDate, status: newStatus }
                            });
                        }
                        // Update the map so subsequent logs see latest checkOut
                        recordMap.set(key, { ...existing, checkOut: logDate, status: newStatus } as any);
                        syncedCount++;
                    } else {
                        skippedCount++;
                    }
                }
            }

            // ── BATCH CREATE: 1 query for all new records ──
            if (toCreate.length > 0) {
                await prisma.attendance.createMany({ data: toCreate, skipDuplicates: true });
                logger.info(`Batch created ${toCreate.length} attendance records for ${machineName}`);
            }

            // Update machine last sync
            await prisma.attendanceMachine.update({
                where: { id: machineId },
                data: { lastSync: new Date() }
            });

            await zk.disconnect();
            
            logger.info(`Sync result for ${machineName}: synced=${syncedCount}, skipped=${skippedCount}, total_logs=${logs.data.length}, mapped_users=${userMap.size}`);
            
            // Log unique user_ids from machine để giúp debug mapping
            const uniqueIds = [...new Set(logs.data.map((l: any) => (l.user_id || l.deviceUserId || '').toString()))];
            logger.info(`Unique user_ids from ${machineName}: ${uniqueIds.slice(0, 20).join(', ')}${uniqueIds.length > 20 ? '...' : ''} (total: ${uniqueIds.length})`);
            logger.info(`Mapped enrollNumbers in DB: ${[...userMap.keys()].join(', ')}`);
            
            return { success: true, synced: syncedCount, skipped: skippedCount, totalLogs: logs.data.length, uniqueUserIds: uniqueIds.length };
        } catch (error: any) {
            try { await zk.disconnect(); } catch (e) {}
            throw error;
        }
    }

    /**
     * Add or update machine
     */
    async saveMachine(data: any) {
        if (data.id) {
            return prisma.attendanceMachine.update({
                where: { id: data.id },
                data
            });
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

        logger.info(`Connecting to machine ${machine.name} (${machine.ip}:${machine.port})...`);
        
        // Use a shorter timeout for initial connection
        const zk = new ZKLib(machine.ip, machine.port, 5000, 4000);
        try {
            await zk.createSocket();
            logger.info(`Socket created for ${machine.name}`);
            
            const result = await zk.getUsers();
            await zk.disconnect();
            
            if (result?.data && result.data.length > 0) {
                logger.info(`Machine ${machine.name} fetched ${result.data.length} users`);
            } else {
                logger.warn(`Machine ${machine.name} returned no users. Raw result: ${JSON.stringify(result)}`);
            }
            
            const machineUsers = (result?.data || []).map((u: any) => ({
                uid: u.uid,
                id: u.userId || u.user_id || u.uid,
                name: u.name || u.userName || '',
                role: u.role,
                cardno: u.cardno,
            }));

            const dbUsers = await prisma.user.findMany({
                where: { enrollNumber: { not: null } },
                select: { id: true, fullName: true, enrollNumber: true }
            });
            const mappedIds = new Set(dbUsers.map(u => u.enrollNumber));

            return {
                machineName: machine.name,
                users: machineUsers.map((mu: any) => ({
                    ...mu,
                    mapped: mappedIds.has(mu.id?.toString()),
                }))
            };
        } catch (error: any) {
            logger.error(`Error connecting to machine ${machine.name}: ${error.message}`);
            try { await zk.disconnect(); } catch (e) {}
            throw new Error(`Không thể kết nối tới máy chấm công (${machine.ip}:${machine.port}). Vui lòng kiểm tra lại đường truyền hoặc IP của máy.`);
        }
    }

    async deleteMachine(id: number) {
        return prisma.attendanceMachine.delete({ where: { id } });
    }
}

export const attendanceMachineService = new AttendanceMachineService();
