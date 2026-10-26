/**
 * Zod schemas for the Day 9 Owner Console: users, moderation, comments,
 * song performance, storage, curation, team, settings and audit log —
 * plus creator analytics, similar tracks and Daily Mix.
 */
import { z } from "zod";
import { planPricesSchema } from "./billing.validator.js";
import {
  ADMIN_COMMENT_ACTIONS,
  CATALOG_FILTERS,
  COMMENT_MAX_LENGTH,
  COMMENT_STATUS,
  HOME_SECTION_MAX_ITEMS,
  HOME_SECTION_TYPES,
  INVITABLE_STAFF_ROLES,
  MODERATION_ACTIONS,
  PERFORMANCE_RANGES,
  PERFORMANCE_SORTS,
  PLAYLIST_DESCRIPTION_MAX,
  PLAYLIST_MAX_TRACKS,
  PLAYLIST_NAME_MAX,
  REPORT_TARGET_TYPES,
} from "../config/constants.js";

const objectId = (label = "id") =>
  z.string().regex(/^[0-9a-f]{24}$/i, { error: `Invalid ${label}` });
const page = z.coerce.number().int().min(1).max(10000).default(1);
const limit = (max = 100, fallback = 25) =>
  z.coerce.number().int().min(1).max(max).default(fallback);
const search = z.string().trim().max(100).optional();
const flag = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");
const range = z.coerce
  .number()
  .int()
  .refine((value) => PERFORMANCE_RANGES.includes(value), {
    error: "Choose 7, 30, 90 or 0 (all time)",
  })
  .default(30);
const password = z.string().min(8, { error: "Use at least 8 characters" }).max(128);

export const idParamsSchema = z.object({ id: objectId() });

/* ===== Users & creators ===== */

export const listUsersQuerySchema = z.object({
  q: search,
  filter: z.enum(["all", "listeners", "creators", "suspended", "verification"]).default("all"),
  page,
  limit: limit(100, 25),
});
export const userStatusSchema = z.object({ status: z.enum(["active", "suspended"]) });
export const creatorRoleSchema = z.object({ isCreator: z.boolean() });
export const verifySchema = z.object({ verified: z.boolean() });

/* ===== Moderation ===== */

export const listReportsQuerySchema = z.object({
  status: z.enum(["open", "dismissed", "actioned"]).default("open"),
  targetType: z.enum(REPORT_TARGET_TYPES).optional(),
  page,
  limit: limit(50, 20),
});
export const moderateSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: objectId("item"),
  action: z.enum(MODERATION_ACTIONS),
  note: z.string().trim().max(200).optional(),
});

/* ===== Comments ===== */

export const listCommentsQuerySchema = z.object({
  q: search,
  status: z.enum(COMMENT_STATUS).optional(),
  trackId: objectId("song").optional(),
  userId: objectId("user").optional(),
  reported: flag,
  page,
  limit: limit(100, 25),
});
export const commentActionSchema = z.object({ action: z.enum(ADMIN_COMMENT_ACTIONS) });
export const commentReplySchema = z.object({
  body: z.string().trim().min(1, { error: "Write a reply" }).max(COMMENT_MAX_LENGTH),
});

/* ===== Song performance ===== */

export const performanceQuerySchema = z.object({
  range,
  catalog: z.enum(["all", "official", "community", "ai"]).default("all"),
  q: search,
  sort: z.enum(PERFORMANCE_SORTS).default("plays"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page,
  limit: limit(200, 50),
});
export const trackPerformanceQuerySchema = z.object({ range });

/* ===== Storage ===== */

export const storageKeyParamsSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]{1,32}$/, { error: "Invalid account" }),
});
export const storageStatusSchema = z.object({ status: z.enum(["paused", "active"]) });
export const storageMoveSchema = z.object({
  fromKey: z.string().regex(/^[a-z0-9-]{1,32}$/),
  toKey: z.string().regex(/^[a-z0-9-]{1,32}$/),
  trackIds: z.array(objectId("song")).max(200).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

/* ===== Curation ===== */

const httpsUrl = z.url({ protocol: /^https$/, error: "Use an https:// link" }).max(500);
const appLink = z
  .string()
  .trim()
  .max(300)
  .refine((value) => /^\/[a-z0-9/_\-?=&%.]*$/i.test(value) || /^https:\/\//.test(value), {
    error: "Use an app path like /browse/vibe/chill or an https:// link",
  });
const sectionFields = {
  title: z.string().trim().min(1, { error: "Enter a title" }).max(80),
  subtitle: z.string().trim().max(160).default(""),
  imageUrl: z.union([httpsUrl, z.null()]).optional(),
  link: z.union([appLink, z.null()]).optional(),
  playlistId: z.union([objectId("playlist"), z.null()]).optional(),
  itemIds: z.array(objectId("item")).max(HOME_SECTION_MAX_ITEMS).default([]),
  active: z.boolean().default(true),
  startsAt: z.union([z.null(), z.coerce.date()]).optional(),
  endsAt: z.union([z.null(), z.coerce.date()]).optional(),
};
export const createHomeSectionSchema = z
  .object({ type: z.enum(HOME_SECTION_TYPES), ...sectionFields })
  .refine((value) => !value.startsAt || !value.endsAt || value.endsAt > value.startsAt, {
    error: "End must be after start",
    path: ["endsAt"],
  });
export const updateHomeSectionSchema = z
  .object({
    title: sectionFields.title.optional(),
    subtitle: z.string().trim().max(160).optional(),
    imageUrl: sectionFields.imageUrl,
    link: sectionFields.link,
    playlistId: sectionFields.playlistId,
    itemIds: z.array(objectId("item")).max(HOME_SECTION_MAX_ITEMS).optional(),
    active: z.boolean().optional(),
    startsAt: sectionFields.startsAt,
    endsAt: sectionFields.endsAt,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { error: "Nothing to update" });
export const reorderSchema = z.object({ ids: z.array(objectId()).min(1).max(200) });

export const createEditorialSchema = z.object({
  name: z.string().trim().min(1, { error: "Give it a name" }).max(PLAYLIST_NAME_MAX),
  description: z.string().trim().max(PLAYLIST_DESCRIPTION_MAX).default(""),
  isPublic: z.boolean().default(true),
  trackIds: z.array(objectId("song")).max(PLAYLIST_MAX_TRACKS).default([]),
});
export const updateEditorialSchema = z
  .object({
    name: z.string().trim().min(1).max(PLAYLIST_NAME_MAX).optional(),
    description: z.string().trim().max(PLAYLIST_DESCRIPTION_MAX).optional(),
    isPublic: z.boolean().optional(),
    trackIds: z.array(objectId("song")).max(PLAYLIST_MAX_TRACKS).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { error: "Nothing to update" });

/* ===== Team ===== */

export const inviteSchema = z.object({
  email: z.email({ error: "Enter a valid email" }).trim().toLowerCase().max(254),
  staffRole: z.enum(INVITABLE_STAFF_ROLES),
});
export const staffRoleSchema = z.object({ staffRole: z.enum(INVITABLE_STAFF_ROLES) });
export const inviteTokenParamsSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{20,200}$/, { error: "Invalid invite" }),
});
export const acceptInviteSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  password,
});

/* ===== Settings ===== */

const ipAddress = z
  .string()
  .trim()
  .max(45)
  .regex(/^[0-9a-fA-F:.]+$/, { error: "Enter an IP address like 203.0.113.7" });
export const settingsSchema = z
  .object({
    maintenance: z
      .object({ enabled: z.boolean(), message: z.string().trim().min(1).max(200) })
      .partial()
      .optional(),
    features: z
      .object({
        comments: z.boolean(),
        uploads: z.boolean(),
        voice: z.boolean(),
        payments: z.boolean(),
      })
      .partial()
      .optional(),
    uploadLimits: z
      .object({
        free: z.number().int().min(0).max(10000).nullable(),
        premium: z.number().int().min(0).max(10000).nullable(),
        creatorPro: z.number().int().min(0).max(100000).nullable(),
      })
      .partial()
      .optional(),
    adminIpAllowlist: z.array(ipAddress).max(50).optional(),
    planPrices: planPricesSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { error: "Nothing to update" });

/* ===== Audit log ===== */

export const auditQuerySchema = z.object({
  staffId: objectId("staff member").optional(),
  action: z.string().trim().max(60).optional(),
  targetType: z.string().trim().max(30).optional(),
  targetId: z.string().trim().max(60).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page,
  limit: limit(200, 50),
});

/* ===== Listener / creator side ===== */

export const creatorAnalyticsQuerySchema = z.object({ range });
export const verificationRequestSchema = z.object({ note: z.string().trim().max(500).default("") });
export const similarQuerySchema = z.object({
  catalog: z.enum(CATALOG_FILTERS).default("all"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export const catalogOnlyQuerySchema = z.object({ catalog: z.enum(CATALOG_FILTERS).default("all") });
