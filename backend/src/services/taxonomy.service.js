/**
 * Staff management of genres and vibes (PRD BRW-1, roadmap Day 7
 * "Admin Genres & Vibes page: add, rename, reorder, icon and colour").
 * Browse, Search and the onboarding quiz all read from these collections.
 * The slug is the stable id songs are tagged with, so it never changes after
 * creation; a category still used by songs can be hidden but not deleted.
 */
import { Genre } from "../models/genre.model.js";
import { Vibe } from "../models/vibe.model.js";
import { Track } from "../models/track.model.js";
import { ArtistProfile } from "../models/artistProfile.model.js";
import { deleteCached } from "./cache.service.js";
import { slugify } from "../helpers/genericFunctions.js";
import { ApiError } from "../utils/ApiError.js";
import { CATALOG_FILTERS, ERROR_CODES } from "../config/constants.js";
import { logger } from "../utils/logger.js";

const MODELS = { genre: Genre, vibe: Vibe };
const TRACK_FIELD = { genre: "genres", vibe: "vibes" };
const LABEL = { genre: "Genre", vibe: "Vibe" };

/**
 * Drop cached taxonomy and browse stats so changes show at once.
 * @param {"genre"|"vibe"} kind
 * @returns {Promise<void>}
 */
function clearCaches(kind) {
  return deleteCached(
    "taxonomy:active",
    ...CATALOG_FILTERS.map((catalog) => `browse:stats:${kind}:${catalog}`)
  );
}

/**
 * Staff view of one category.
 * @param {Object} item - Lean Genre/Vibe
 * @param {number} [trackCount]
 * @returns {Object}
 */
export function toManagedCategory(item, trackCount = 0) {
  return {
    id: String(item._id),
    slug: item.slug,
    name: item.name,
    icon: item.icon,
    colour: item.colour,
    description: item.description ?? "",
    order: item.order ?? 0,
    active: Boolean(item.active),
    trackCount,
    updatedAt: item.updatedAt,
  };
}

/**
 * Every genre or vibe (hidden ones too), in display order, with song counts.
 * @param {"genre"|"vibe"} kind
 * @returns {Promise<Object[]>}
 */
export async function listManagedCategories(kind) {
  const field = TRACK_FIELD[kind];
  const [items, counts] = await Promise.all([
    MODELS[kind].find().sort({ order: 1, name: 1 }).lean(),
    Track.aggregate([
      { $unwind: `$${field}` },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    ]),
  ]);
  const countBySlug = new Map(counts.map((row) => [row._id, row.count]));
  return items.map((item) => toManagedCategory(item, countBySlug.get(item.slug) ?? 0));
}

/**
 * Add a genre or vibe at the end of the list.
 * @param {"genre"|"vibe"} kind
 * @param {{ name: string, slug?: string, icon: string, colour: string, description?: string, active?: boolean }} input
 * @returns {Promise<Object>}
 * @throws {ApiError} 409 when the slug already exists
 */
export async function createCategory(kind, input) {
  const Model = MODELS[kind];
  const slug = input.slug || slugify(input.name);
  if (!slug)
    throw ApiError.badRequest("Use letters or numbers in the name", {
      code: ERROR_CODES.VALIDATION_FAILED,
    });
  if (await Model.exists({ slug })) {
    throw ApiError.conflict(`${LABEL[kind]} "${slug}" already exists`, {
      code: ERROR_CODES.ALREADY_EXISTS,
    });
  }
  const last = await Model.findOne().sort({ order: -1 }).select("order").lean();
  const item = await Model.create({ ...input, slug, order: (last?.order ?? -1) + 1 });
  await clearCaches(kind);
  logger.info(`[Taxonomy] ${kind} created slug=${slug}`);
  return toManagedCategory(item.toObject());
}

/**
 * Rename, re-icon, recolour, describe or show/hide a category (slug is fixed).
 * @param {"genre"|"vibe"} kind
 * @param {string} id
 * @param {Object} changes
 * @returns {Promise<Object>}
 * @throws {ApiError} 404
 */
export async function updateCategory(kind, id, changes) {
  const item = await MODELS[kind]
    .findByIdAndUpdate(id, { $set: changes }, { returnDocument: "after", runValidators: true })
    .lean();
  if (!item) throw ApiError.notFound(`${LABEL[kind]} not found`, { code: ERROR_CODES.NOT_FOUND });
  await clearCaches(kind);
  const trackCount = await Track.countDocuments({ [TRACK_FIELD[kind]]: item.slug });
  return toManagedCategory(item, trackCount);
}

/**
 * Save a new display order.
 * @param {"genre"|"vibe"} kind
 * @param {string[]} ids - Every category id, in the new order
 * @returns {Promise<Object[]>} The full list in its new order
 * @throws {ApiError} 400 when the list doesn't contain every category exactly once
 */
export async function reorderCategories(kind, ids) {
  const Model = MODELS[kind];
  const existing = await Model.find().select("_id").lean();
  const known = new Set(existing.map((item) => String(item._id)));
  const unique = new Set(ids);
  if (
    unique.size !== ids.length ||
    unique.size !== known.size ||
    ids.some((id) => !known.has(id))
  ) {
    throw ApiError.badRequest("Send every item exactly once", {
      code: ERROR_CODES.VALIDATION_FAILED,
    });
  }
  await Model.bulkWrite(
    ids.map((id, order) => ({ updateOne: { filter: { _id: id }, update: { $set: { order } } } }))
  );
  await clearCaches(kind);
  return listManagedCategories(kind);
}

/**
 * Delete a category nobody uses. Used ones must be hidden instead, so songs
 * and artist tags never point at something missing.
 * @param {"genre"|"vibe"} kind
 * @param {string} id
 * @returns {Promise<void>}
 * @throws {ApiError} 404, or 409 when songs or artists still use it
 */
export async function deleteCategory(kind, id) {
  const Model = MODELS[kind];
  const item = await Model.findById(id).lean();
  if (!item) throw ApiError.notFound(`${LABEL[kind]} not found`, { code: ERROR_CODES.NOT_FOUND });
  const field = TRACK_FIELD[kind];
  const [songs, artists] = await Promise.all([
    Track.countDocuments({ [field]: item.slug }),
    ArtistProfile.countDocuments({ [field]: item.slug }),
  ]);
  if (songs + artists > 0) {
    throw ApiError.conflict(
      `${item.name} is used by ${songs} song(s) and ${artists} artist(s) — hide it instead`,
      { code: ERROR_CODES.IN_USE, songs, artists }
    );
  }
  await Model.deleteOne({ _id: id });
  await clearCaches(kind);
  logger.info(`[Taxonomy] ${kind} deleted slug=${item.slug}`);
}
