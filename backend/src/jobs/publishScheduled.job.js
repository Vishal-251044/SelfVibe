/**
 * Scheduled releases (PRD MUS-3): every minute, publish processed tracks whose
 * release time has passed.
 */
import { Track } from "../models/track.model.js";
import { logger } from "../utils/logger.js";

export const PUBLISH_SCHEDULED_EVERY_MS = 60 * 1000;

/**
 * @returns {Promise<number>} How many tracks were published
 */
export async function publishScheduledJob() {
  const now = new Date();
  const result = await Track.updateMany(
    { status: "scheduled", scheduledAt: { $lte: now }, "processing.state": "done" },
    { $set: { status: "published", publishedAt: now, releaseIntent: "publish" } }
  );
  if (result.modifiedCount > 0) {
    logger.info(`[ScheduledRelease] published ${result.modifiedCount} scheduled track(s)`);
  }
  return result.modifiedCount;
}
