/**
 * Staff permission matrix for the Owner / Admin Console (PRD §8.2, staff roles).
 * Routes check a permission, never a role name, so changing who can do what
 * only means editing this table.
 */
import { STAFF_ROLES } from "./constants.js";

const ALL_STAFF = STAFF_ROLES;
const CONTENT_TEAM = ["owner", "admin", "contentManager"];
const ADMINS = ["owner", "admin"];
const OWNER_ONLY = ["owner"];

/** permission → staff roles allowed to use it */
export const STAFF_PERMISSIONS = Object.freeze({
  "console.access": ALL_STAFF, // log in to the console (with 2FA)
  "dashboard.view": ALL_STAFF, // dashboard and analytics
  "reports.manage": ["owner", "admin", "moderator"], // reports, take down / restore
  "music.manage": CONTENT_TEAM, // add music (single + bulk upload)
  "catalog.edit": CONTENT_TEAM, // edit any track, artist, album metadata
  "curation.manage": CONTENT_TEAM, // home page, featured tracks, editorial playlists
  "genres.manage": CONTENT_TEAM, // genres and vibes
  "users.manage": ADMINS, // suspend, verify, change role
  "ai.manage": ADMINS, // AI provider, quotas, review AI tracks
  "audit.view": ADMINS, // full audit log
  "settings.manage": OWNER_ONLY, // platform settings, plans, feature flags
  "team.manage": OWNER_ONLY, // invite / remove staff, assign roles
});

/**
 * Whether a staff role has a permission.
 * @param {string|null|undefined} staffRole - e.g. "moderator"
 * @param {string} permission - e.g. "music.manage"
 * @returns {boolean} false for unknown roles or permissions
 */
export function hasPermission(staffRole, permission) {
  return Boolean(staffRole && STAFF_PERMISSIONS[permission]?.includes(staffRole));
}

/**
 * Every permission a staff role has (sent to the console to show / hide modules).
 * @param {string} staffRole
 * @returns {string[]}
 */
export function getPermissionsForRole(staffRole) {
  return Object.keys(STAFF_PERMISSIONS).filter((permission) =>
    hasPermission(staffRole, permission)
  );
}
