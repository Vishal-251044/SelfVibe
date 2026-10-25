/**
 * Curation (PRD 10.9.2 Curation, roadmap Day 9): staff arrange Home page
 * sections — hero banners, featured tracks, featured artists and editorial
 * playlists — and build editorial playlists ("SelfVibe Code Mode").
 * getPublicHomeSections() is what the Home page shows (active, in their
 * date window, in order, honouring the catalog switch for songs).
 */
import mongoose from "mongoose";
import { HomeSection } from "../../models/homeSection.model.js";
import { Playlist } from "../../models/playlist.model.js";
import { Track } from "../../models/track.model.js";
import { ArtistProfile } from "../../models/artistProfile.model.js";
import { User } from "../../models/user.model.js";
import { publishedFilter } from "../browse.service.js";
import { mosaicCovers } from "../playlist.service.js";
import { deleteCached, remember } from "../cache.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { ERROR_CODES, PLAYLIST_MAX_TRACKS } from "../../config/constants.js";

const ARTIST_REF_FIELDS = "stageName slug avatar verified";
const PUBLIC_CACHE_KEY = "home:sections";
const PUBLIC_CACHE_SECONDS = 60;

/* ===== Home sections ===== */

/**
 * Staff view of a section.
 * @param {Object} section - Lean
 * @param {Map<string, string>} [labels] - id → title / name, to show what the items are
 * @returns {Object}
 */
function toAdminSection(section, labels = new Map()) {
  return {
    id: String(section._id),
    type: section.type,
    title: section.title,
    subtitle: section.subtitle ?? "",
    imageUrl: section.imageUrl ?? null,
    link: section.link ?? null,
    playlistId: section.playlistId ? String(section.playlistId) : null,
    playlistName: section.playlistId ? (labels.get(String(section.playlistId)) ?? null) : null,
    items: (section.itemIds ?? []).map((id) => ({
      id: String(id),
      label: labels.get(String(id)) ?? "(removed)",
    })),
    order: section.order ?? 0,
    active: Boolean(section.active),
    startsAt: section.startsAt ?? null,
    endsAt: section.endsAt ?? null,
    updatedAt: section.updatedAt,
  };
}

/**
 * Names for the ids used by sections (songs, artists, playlists).
 * @param {Object[]} sections
 * @returns {Promise<Map<string, string>>}
 */
async function labelsFor(sections) {
  const ids = sections.flatMap((section) => [
    ...(section.itemIds ?? []),
    ...(section.playlistId ? [section.playlistId] : []),
  ]);
  const [tracks, artists, playlists] = await Promise.all([
    Track.find({ _id: { $in: ids } })
      .select("title")
      .lean(),
    ArtistProfile.find({ _id: { $in: ids } })
      .select("stageName")
      .lean(),
    Playlist.find({ _id: { $in: ids } })
      .select("name")
      .lean(),
  ]);
  return new Map([
    ...tracks.map((track) => [String(track._id), track.title]),
    ...artists.map((artist) => [String(artist._id), artist.stageName]),
    ...playlists.map((playlist) => [String(playlist._id), playlist.name]),
  ]);
}

/** @returns {Promise<Object[]>} Every section, in order */
export async function listHomeSections() {
  const sections = await HomeSection.find().sort({ order: 1, createdAt: 1 }).lean();
  const labels = await labelsFor(sections);
  return sections.map((section) => toAdminSection(section, labels));
}

/**
 * Check that a section's items exist and fit its type.
 * @param {Object} input
 * @returns {Promise<void>}
 * @throws {ApiError} 400
 */
async function assertSectionItems(input) {
  const ids = input.itemIds ?? [];
  if (input.type === "featuredTracks" && ids.length) {
    const found = await Track.countDocuments({ _id: { $in: ids } });
    if (found !== new Set(ids).size)
      throw ApiError.badRequest("Some songs no longer exist", {
        fields: { itemIds: "Unknown song" },
      });
  }
  if (input.type === "featuredArtists" && ids.length) {
    const found = await ArtistProfile.countDocuments({ _id: { $in: ids } });
    if (found !== new Set(ids).size)
      throw ApiError.badRequest("Some artists no longer exist", {
        fields: { itemIds: "Unknown artist" },
      });
  }
  if (input.type === "editorial") {
    const playlist =
      input.playlistId && (await Playlist.exists({ _id: input.playlistId, type: "editorial" }));
    if (!playlist)
      throw ApiError.badRequest("Pick an editorial playlist", {
        fields: { playlistId: "Pick an editorial playlist" },
      });
  }
}

/**
 * Add a section at the end.
 * @param {Object} input - Validated
 * @param {string} staffId
 * @returns {Promise<Object>}
 */
export async function createHomeSection(input, staffId) {
  await assertSectionItems(input);
  const last = await HomeSection.findOne().sort({ order: -1 }).select("order").lean();
  const section = await HomeSection.create({
    ...input,
    order: (last?.order ?? -1) + 1,
    updatedBy: staffId,
  });
  await deleteCached(PUBLIC_CACHE_KEY);
  const [view] = (await listHomeSections()).filter((item) => item.id === String(section._id));
  return view;
}

/**
 * Edit a section (its type is fixed).
 * @param {string} id
 * @param {Object} changes - Validated
 * @param {string} staffId
 * @returns {Promise<{ before: Object, after: Object }>}
 */
export async function updateHomeSection(id, changes, staffId) {
  const section = await HomeSection.findById(id);
  if (!section) throw ApiError.notFound("Section not found", { code: ERROR_CODES.NOT_FOUND });
  const before = toAdminSection(section.toObject());
  await assertSectionItems({ type: section.type, ...changes });
  Object.assign(section, changes, { updatedBy: staffId });
  await section.save();
  await deleteCached(PUBLIC_CACHE_KEY);
  const labels = await labelsFor([section.toObject()]);
  return { before, after: toAdminSection(section.toObject(), labels) };
}

/**
 * Save a new order (every section id once).
 * @param {string[]} ids
 * @returns {Promise<Object[]>}
 */
export async function reorderHomeSections(ids) {
  const existing = await HomeSection.find().select("_id").lean();
  const known = new Set(existing.map((section) => String(section._id)));
  if (
    new Set(ids).size !== ids.length ||
    ids.length !== known.size ||
    ids.some((id) => !known.has(id))
  ) {
    throw ApiError.badRequest("Send every section exactly once");
  }
  await HomeSection.bulkWrite(
    ids.map((id, order) => ({ updateOne: { filter: { _id: id }, update: { $set: { order } } } }))
  );
  await deleteCached(PUBLIC_CACHE_KEY);
  return listHomeSections();
}

/**
 * @param {string} id
 * @returns {Promise<Object>} The deleted section
 */
export async function deleteHomeSection(id) {
  const section = await HomeSection.findByIdAndDelete(id).lean();
  if (!section) throw ApiError.notFound("Section not found", { code: ERROR_CODES.NOT_FOUND });
  await deleteCached(PUBLIC_CACHE_KEY);
  return toAdminSection(section);
}

/* ===== What Home shows ===== */

/**
 * Live sections for listeners (ids cached a minute; songs re-read each time).
 * @param {{ catalog?: string }} [options]
 * @returns {Promise<Object[]>} { id, type, title, subtitle, imageUrl, link, tracks?, artists?, playlist? }
 */
export async function getPublicHomeSections({ catalog = "all" } = {}) {
  const sections = await remember(PUBLIC_CACHE_KEY, PUBLIC_CACHE_SECONDS, async () => {
    const now = new Date();
    const rows = await HomeSection.find({
      active: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
      ],
    })
      .sort({ order: 1 })
      .lean();
    return rows.map((row) => ({
      ...row,
      _id: String(row._id),
      itemIds: (row.itemIds ?? []).map(String),
      playlistId: row.playlistId ? String(row.playlistId) : null,
    }));
  });

  const trackIds = sections.filter((s) => s.type === "featuredTracks").flatMap((s) => s.itemIds);
  const artistIds = sections.filter((s) => s.type === "featuredArtists").flatMap((s) => s.itemIds);
  const playlistIds = sections.filter((s) => s.type === "editorial").map((s) => s.playlistId);
  const [tracks, artists, playlists] = await Promise.all([
    trackIds.length
      ? Track.find({ _id: { $in: trackIds }, ...publishedFilter(catalog) })
          .populate("artistId", ARTIST_REF_FIELDS)
          .lean()
      : [],
    artistIds.length ? ArtistProfile.find({ _id: { $in: artistIds } }).lean() : [],
    playlistIds.length
      ? Playlist.find({ _id: { $in: playlistIds }, type: "editorial", isPublic: true }).lean()
      : [],
  ]);
  const covers = await mosaicCovers(playlists);
  const byId = (list) => new Map(list.map((item) => [String(item._id), item]));
  const trackMap = byId(tracks);
  const artistMap = byId(artists);
  const playlistMap = byId(playlists);

  return sections
    .map((section) => {
      const base = {
        id: section._id,
        type: section.type,
        title: section.title,
        subtitle: section.subtitle ?? "",
        imageUrl: section.imageUrl ?? null,
        link: section.link ?? null,
      };
      if (section.type === "featuredTracks")
        return { ...base, tracks: section.itemIds.map((id) => trackMap.get(id)).filter(Boolean) };
      if (section.type === "featuredArtists")
        return { ...base, artists: section.itemIds.map((id) => artistMap.get(id)).filter(Boolean) };
      if (section.type === "editorial") {
        const playlist = playlistMap.get(section.playlistId);
        return playlist
          ? { ...base, playlist, covers: covers.get(String(playlist._id)) ?? [] }
          : null;
      }
      return base; // hero
    })
    .filter(
      (section) =>
        section &&
        (section.type === "hero" ||
          section.tracks?.length ||
          section.artists?.length ||
          section.playlist)
    );
}

/* ===== Editorial playlists ===== */

/**
 * The account editorial playlists belong to (the Owner — shown as "SelfVibe").
 * @returns {Promise<Object>}
 */
async function editorialOwnerId() {
  const owner = await User.findOne({ staffRole: "owner" }).select("_id").lean();
  if (!owner) throw ApiError.badRequest("Create the Owner account first (npm run create-owner)");
  return owner._id;
}

/**
 * Staff view of an editorial playlist.
 * @param {Object} playlist - Lean
 * @param {string[]} covers
 * @returns {Object}
 */
function toEditorial(playlist, covers = []) {
  return {
    id: String(playlist._id),
    name: playlist.name,
    description: playlist.description ?? "",
    isPublic: Boolean(playlist.isPublic),
    coverUrl: playlist.coverUrl ?? null,
    covers,
    trackIds: (playlist.tracks ?? []).map((entry) => String(entry.trackId)),
    trackCount: playlist.tracks?.length ?? 0,
    updatedAt: playlist.updatedAt,
  };
}

/** @returns {Promise<Object[]>} */
export async function listEditorialPlaylists() {
  const playlists = await Playlist.find({ type: "editorial" }).sort({ updatedAt: -1 }).lean();
  const covers = await mosaicCovers(playlists);
  return playlists.map((playlist) => toEditorial(playlist, covers.get(String(playlist._id))));
}

/**
 * Published songs, in the given order (unknown / unpublished ones dropped).
 * @param {string[]} trackIds
 * @returns {Promise<Array<{ trackId: Object, addedAt: Date }>>}
 */
async function playlistEntries(trackIds) {
  const unique = [...new Set(trackIds)].slice(0, PLAYLIST_MAX_TRACKS);
  const found = await Track.find({ _id: { $in: unique }, status: "published" })
    .select("_id")
    .lean();
  const ok = new Set(found.map((track) => String(track._id)));
  const now = new Date();
  return unique
    .filter((id) => ok.has(id))
    .map((id) => ({ trackId: new mongoose.Types.ObjectId(id), addedAt: now }));
}

/**
 * @param {{ name: string, description?: string, isPublic?: boolean, trackIds?: string[] }} input
 * @returns {Promise<Object>}
 */
export async function createEditorialPlaylist({ trackIds = [], ...input }) {
  const playlist = await Playlist.create({
    ...input,
    ownerId: await editorialOwnerId(),
    type: "editorial",
    tracks: await playlistEntries(trackIds),
  });
  const covers = await mosaicCovers([playlist.toObject()]);
  return toEditorial(playlist.toObject(), covers.get(String(playlist._id)));
}

/**
 * Edit name / description / visibility, or replace the song list (kept in order).
 * @param {string} id
 * @param {{ name?: string, description?: string, isPublic?: boolean, trackIds?: string[] }} changes
 * @returns {Promise<{ before: Object, after: Object }>}
 */
export async function updateEditorialPlaylist(id, { trackIds, ...changes }) {
  const playlist = await Playlist.findOne({ _id: id, type: "editorial" });
  if (!playlist) throw ApiError.notFound("Playlist not found", { code: ERROR_CODES.NOT_FOUND });
  const before = toEditorial(playlist.toObject());
  Object.assign(playlist, changes);
  if (trackIds) {
    // Keep the original "added" time of songs that were already there
    const previous = new Map(
      playlist.tracks.map((entry) => [String(entry.trackId), entry.addedAt])
    );
    playlist.tracks = (await playlistEntries(trackIds)).map((entry) => ({
      ...entry,
      addedAt: previous.get(String(entry.trackId)) ?? entry.addedAt,
    }));
  }
  await playlist.save();
  await deleteCached(PUBLIC_CACHE_KEY);
  const covers = await mosaicCovers([playlist.toObject()]);
  return { before, after: toEditorial(playlist.toObject(), covers.get(String(playlist._id))) };
}

/**
 * Delete an editorial playlist (and the Home sections that showed it).
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function deleteEditorialPlaylist(id) {
  const playlist = await Playlist.findOneAndDelete({ _id: id, type: "editorial" }).lean();
  if (!playlist) throw ApiError.notFound("Playlist not found", { code: ERROR_CODES.NOT_FOUND });
  await HomeSection.deleteMany({ type: "editorial", playlistId: playlist._id });
  await deleteCached(PUBLIC_CACHE_KEY);
  return toEditorial(playlist);
}
