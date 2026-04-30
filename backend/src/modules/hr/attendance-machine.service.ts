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

        const zk = new ZKLib(machine.ip, machine.port, 10000, 4000);
        
        try {
            // Establish connection
            await zk.createSocket();
            
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

            for (const log of logs.data) {
                // ZKTeco trả về: user_id, record_time (không phải deviceUserId, recordTime)
                const deviceUserId = log.user_id || log.deviceUserId || log.userSn || log.uid;
                if (!deviceUserId) {
                    logger.warn(`Skipping log with no user_id: ${JSON.stringify(log)}`);
                    continue;
                }

                const userId = userMap.get(deviceUserId.toString());
                if (!userId) {
                    skippedCount++;
                    continue;
                }

                const logDate = new Date(log.record_time || log.recordTime);
                const dateOnly = new Date(logDate);
                dateOnly.setHours(0, 0, 0, 0);

                // Check if already exists for this user and date
                const existing = await prisma.attendance.findUnique({
                    where: { userId_date: { userId, date: dateOnly } }
                });

                // Determine status based on machine and time
                let status: AttendanceStatus = AttendanceStatus.PRESENT;
                const h = logDate.getHours();
                const m = logDate.getMinutes();
                const s = logDate.getSeconds();
                const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                
                if (machineName.includes('VP')) {
                    if (timeStr >= '08:01:00') {
                        status = AttendanceStatus.LATE;
                    }
                } else if (machineName.includes('SX')) {
                    if (timeStr >= '07:01:00') {
                        status = AttendanceStatus.LATE;
                    }
                }

                if (!existing) {
                    // Create new attendance record
                    await prisma.attendance.create({
                        data: {
                            userId,
                            date: dateOnly,
                            checkIn: logDate,
                            status,
                            note: `Máy: ${machineName}`
                        }
                    });
                    syncedCount++;
                } else {
                    // Update check-out if it's later than current check-in
                    if (!existing.checkOut || logDate > existing.checkOut) {
                        // If logDate is same as checkIn, skip
                        if (existing.checkIn && logDate.getTime() === existing.checkIn.getTime()) {
                            skippedCount++;
                            continue;
                        }

                        // Determine if early leave
                        let newStatus = existing.status;
                        const outH = logDate.getHours();
                        const outM = logDate.getMinutes();
                        const outS = logDate.getSeconds();
                        const outTimeStr = `${outH.toString().padStart(2, '0')}:${outM.toString().padStart(2, '0')}:${outS.toString().padStart(2, '0')}`;

                        if (machineName.includes('VP')) {
                            if (outTimeStr < '17:00:00') {
                                newStatus = AttendanceStatus.LATE; 
                            }
                        } else if (machineName.includes('SX')) {
                            if (outTimeStr < '16:00:00') {
                                newStatus = AttendanceStatus.LATE;
                            }
                        }

                        await prisma.attendance.update({
                            where: { id: existing.id },
                            data: { checkOut: logDate, status: newStatus }
                        });
                        syncedCount++;
                    } else {
                        skippedCount++;
                    }
                }
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

        const zk = new ZKLib(machine.ip, machine.port, 10000, 4000);
        try {
            await zk.createSocket();
            const result = await zk.getUsers();
            await zk.disconnect();
            
            // Debug: log raw data structure
            if (result?.data && result.data.length > 0) {
                logger.info(`Machine ${machine.name} raw user sample: ${JSON.stringify(result.data[0])}`);
                logger.info(`Machine ${machine.name} total users: ${result.data.length}`);
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

            // Get existing mappings
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
            try { await zk.disconnect(); } catch (e) {}
            throw error;
        }
    }

    async deleteMachine(id: number) {
        return prisma.attendanceMachine.delete({ where: { id } });
    }
}

export const attendanceMachineService = new AttendanceMachineService();
