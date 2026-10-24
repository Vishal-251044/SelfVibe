/**
 * Content reports (PRD F32): listeners flag tracks / artists for copyright or
 * abuse. Staff review them in the moderation queue (Day 9).
 */
import mongoose from "mongoose";
import { Report } from "../models/report.model.js";
import { Track } from "../models/track.model.js";
import { ArtistProfile } from "../models/artistProfile.model.js";
import { Comment } from "../models/comment.model.js";
import { ERROR_CODES } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

const TARGET_MODELS = { track: Track, artist: ArtistProfile, comment: Comment };

/**
 * File a report. Reporting the same item again updates the open report.
 * @param {string} reporterId
 * @param {{ targetType: "track"|"artist", targetId: string, reason: string, details?: string }} input
 * @returns {Promise<Object>} The report
 * @throws {ApiError} 404 when the item does not exist
 */
export async function createReport(reporterId, { targetType, targetId, reason, details = "" }) {
  const Model = TARGET_MODELS[targetType];
  const exists = mongoose.isValidObjectId(targetId) && (await Model.exists({ _id: targetId }));
  if (!exists) {
    throw ApiError.notFound("That item no longer exists", { code: ERROR_CODES.NOT_FOUND });
  }

  const report = await Report.findOneAndUpdate(
    { reporterId, targetType, targetId, status: "open" },
    { $set: { reason, details } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
  logger.debug(`[ReportService] ${reason} report on ${targetType} ${targetId}`);
  return report;
}
