import cron from 'node-cron';
import { logger } from './logger.config';
import { attendanceMachineService } from '../modules/hr/attendance-machine.service';

/**
 * Initialize scheduled tasks
 */
export const initializeCron = () => {
    logger.info('⏰ Initializing scheduled tasks...');

    // Sync attendance machines every day at 09:00 AM
    // Schedule: 0 9 * * * (minute hour day month day-of-week)
    cron.schedule('0 9 * * *', async () => {
        logger.info('🔄 Auto-syncing attendance machines (Daily 9:00 AM)...');
        try {
            const results = await attendanceMachineService.syncAllMachines();
            logger.info(`✅ Auto-sync completed: ${JSON.stringify(results)}`);
        } catch (error: any) {
            logger.error(`❌ Auto-sync failed: ${error.message}`);
        }
    }, {
        timezone: "Asia/Ho_Chi_Minh"
    });

    // Optional: Sync at 17:15 PM to capture check-outs
    cron.schedule('15 17 * * *', async () => {
        logger.info('🔄 Auto-syncing attendance machines (Daily 17:15 PM)...');
        try {
            const results = await attendanceMachineService.syncAllMachines();
            logger.info(`✅ Auto-sync completed: ${JSON.stringify(results)}`);
        } catch (error: any) {
            logger.error(`❌ Auto-sync failed: ${error.message}`);
        }
    }, {
        timezone: "Asia/Ho_Chi_Minh"
    });

    logger.info('📅 Cron jobs scheduled: 09:00 AM and 05:15 PM');
};
