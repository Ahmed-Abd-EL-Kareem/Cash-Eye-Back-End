// aiLog.retention.job.js
// Scheduled job to archive/expire old AI logs

import { CronJob } from "cron";
import AILogModel from "../modules/aiUsage/aiLog.model.js";
import { logger } from "../config/logger.js";

/**
 * Archive logs older than retentionDays to cold storage
 * Currently just deletes them, but can be extended to move to S3/Blob storage
 * @param {number} retentionDays - Days to keep logs (default: 90)
 * @returns {Promise<{ deletedCount: number }>}
 */
export const archiveOldLogs = async (retentionDays = 90) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  try {
    const result = await AILogModel.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    logger.info(
      `[AILogRetention] Archived ${result.deletedCount} logs older than ${retentionDays} days`
    );

    return { deletedCount: result.deletedCount, cutoffDate };
  } catch (error) {
    logger.error("[AILogRetention] Failed to archive old logs:", error);
    throw error;
  }
};

/**
 * Get log count older than retentionDays (for monitoring)
 * @param {number} retentionDays
 * @returns {Promise<number>}
 */
export const getOldLogsCount = async (retentionDays = 90) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  return AILogModel.countDocuments({ createdAt: { $lt: cutoffDate } });
};

// Daily job at 2 AM UTC
export const aiLogRetentionJob = new CronJob(
  "0 2 * * *",
  async () => {
    logger.info("[AILogRetention] Starting daily archive job...");
    try {
      await archiveOldLogs(90); // Keep 90 days
    } catch (error) {
      logger.error("[AILogRetention] Daily job failed:", error);
    }
  },
  null,
  true,
  "UTC"
);

// Start the job
aiLogRetentionJob.start();

export default { archiveOldLogs, getOldLogsCount, aiLogRetentionJob };