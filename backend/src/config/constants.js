/**
 * Shared enums and limits used by models, services and validators.
 * Values follow PRD §8.2 (roles) and §13 (data model).
 */

export const USER_ROLES = Object.freeze(["listener", "creator"]);

/** Staff roles for the Owner / Admin Console, highest privilege first. */
export const STAFF_ROLES = Object.freeze(["owner", "admin", "contentManager", "moderator"]);

export const USER_STATUS = Object.freeze(["active", "suspended"]);

export const PLANS = Object.freeze(["free", "premium", "creatorPro"]);

export const TRACK_STATUS = Object.freeze([
  "processing",
  "scheduled",
  "published",
  "unpublished",
  "rejected",
  "taken_down",
]);

export const TRACK_SOURCE = Object.freeze(["upload", "ai"]);

export const TRACK_ADDED_VIA = Object.freeze(["creator", "admin", "ai"]);

export const PLAYLIST_TYPES = Object.freeze(["user", "system"]);

export const LISTEN_EVENT_TYPES = Object.freeze(["play", "skip", "complete", "repeat"]);

/** Listen events are kept for 180 days (PRD §13, listenEvents). */
export const LISTEN_EVENT_TTL_SECONDS = 180 * 24 * 60 * 60;
