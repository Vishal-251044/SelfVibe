/**
 * Admin bulk upload (PRD MUS-2, roadmap "bulkImport job"): up to 50 audio
 * files + an optional CSV of metadata. The job matches CSV rows to files,
 * finds or creates artists and albums, creates tracks (each then goes through
 * normal processing) and reports every failed row.
 *
 * CSV columns (header names are case-insensitive; only file_name is required):
 *   file_name, title, artist, album, genres, vibes, mood, language, explicit
 * List columns (genres, vibes) use ";" or "|" between values.
 */
import path from "node:path";
import { parse } from "csv-parse/sync";
import { BulkImport } from "../models/bulkImport.model.js";
import { Album } from "../models/album.model.js";
import { Genre } from "../models/genre.model.js";
import { Vibe } from "../models/vibe.model.js";
import { createTrack } from "./track.service.js";
import { createOfficialArtist, findArtistByName } from "./artist.service.js";
import { queue } from "./queue/index.js";
import { BULK_UPLOAD_MAX_FILES, JOBS, LANGUAGES, MOODS } from "../config/constants.js";
import { slugify } from "../helpers/genericFunctions.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

// Excel adds an invisible byte-order mark at the start of UTF-8 CSV files
const BYTE_ORDER_MARK = new RegExp(`^${String.fromCharCode(0xfeff)}`);

const HEADER_ALIASES = {
  file_name: ["file_name", "filename", "file", "audio", "audio_file"],
  title: ["title", "track", "track_title", "name"],
  artist: ["artist", "artist_name", "singer"],
  album: ["album", "album_title"],
  genres: ["genres", "genre"],
  vibes: ["vibes", "vibe"],
  mood: ["mood"],
  language: ["language", "lang"],
  explicit: ["explicit"],
};

/**
 * Parse the bulk-upload CSV into normalised rows (pure — unit tested).
 * @param {string|null} csvText
 * @returns {{ rows: Array<{ row: number, fileName: string, title?: string, artist?: string, album?: string, genres: string[], vibes: string[], mood?: string, language?: string, explicit: boolean }>, errors: string[] }}
 */
export function parseBulkCsv(csvText) {
  if (!csvText?.trim()) return { rows: [], errors: [] };

  let records;
  try {
    records = parse(csvText.replace(BYTE_ORDER_MARK, ""), {
      columns: (header) =>
        header.map((name) => String(name).trim().toLowerCase().replace(/\s+/g, "_")),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (error) {
    return { rows: [], errors: [`The CSV could not be read: ${error.message}`] };
  }

  const pick = (record, field) => {
    const key = HEADER_ALIASES[field].find(
      (alias) => record[alias] !== undefined && record[alias] !== ""
    );
    return key ? String(record[key]).trim() : undefined;
  };
  const list = (value) =>
    value
      ? value
          .split(/[;|]/)
          .map((item) => slugify(item))
          .filter(Boolean)
      : [];

  const rows = [];
  const errors = [];
  records.forEach((record, index) => {
    const fileName = pick(record, "file_name");
    if (!fileName) {
      errors.push(`Row ${index + 1}: missing file_name`);
      return;
    }
    rows.push({
      row: index + 1,
      fileName,
      title: pick(record, "title"),
      artist: pick(record, "artist"),
      album: pick(record, "album"),
      genres: list(pick(record, "genres")),
      vibes: list(pick(record, "vibes")),
      mood: pick(record, "mood")?.toLowerCase(),
      language: pick(record, "language")?.toLowerCase(),
      explicit: /^(1|true|yes|y)$/i.test(pick(record, "explicit") ?? ""),
    });
  });
  return { rows, errors };
}

/**
 * Comparable file name: lower case, no folder, no extension.
 * @param {string} fileName
 * @returns {string}
 */
export function normaliseFileName(fileName) {
  return path
    .basename(String(fileName))
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/, "")
    .trim();
}

/**
 * "my_song-final.mp3" → "My Song Final" (title when the CSV has none).
 * @param {string} fileName
 * @returns {string}
 */
export function titleFromFileName(fileName) {
  const base = path
    .basename(fileName)
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return (base.charAt(0).toUpperCase() + base.slice(1)).slice(0, 150) || "Untitled";
}

/**
 * Start a bulk upload (files are already uploaded and checked).
 * @param {string} staffId
 * @param {{ files: Array<{ fileName: string, audioKey: string }>, csvText?: string, defaults: Object }} input
 * @returns {Promise<Object>} The BulkImport document
 */
export async function startBulkImport(staffId, { files, csvText, defaults }) {
  if (files.length === 0 || files.length > BULK_UPLOAD_MAX_FILES) {
    throw ApiError.badRequest(`Upload between 1 and ${BULK_UPLOAD_MAX_FILES} files`);
  }
  const { errors } = parseBulkCsv(csvText);
  if (errors.length && errors[0].startsWith("The CSV could not be read")) {
    throw ApiError.badRequest(errors[0], { fields: { csv: errors[0] } });
  }

  const bulk = await BulkImport.create({
    createdBy: staffId,
    files,
    csvText: csvText ?? null,
    defaults,
  });
  await queue.enqueue(
    JOBS.bulkImport,
    { bulkImportId: String(bulk._id) },
    { jobId: `bulk-${bulk._id}`, attempts: 1 }
  );
  return bulk;
}

/**
 * The bulk import job.
 * @param {{ data: { bulkImportId: string } }} job
 * @returns {Promise<void>}
 */
export async function processBulkImportJob({ data }) {
  const bulk = await BulkImport.findById(data.bulkImportId);
  if (!bulk || bulk.status === "done") return;
  bulk.status = "running";
  await bulk.save();

  try {
    const { rows, errors } = parseBulkCsv(bulk.csvText);
    const rowsByFile = new Map(rows.map((row) => [normaliseFileName(row.fileName), row]));
    const [genres, vibes] = await Promise.all([
      Genre.find({ active: true }).select("slug").lean(),
      Vibe.find({ active: true }).select("slug").lean(),
    ]);
    const validGenres = new Set(genres.map((genre) => genre.slug));
    const validVibes = new Set(vibes.map((vibe) => vibe.slug));
    const results = errors.map((message) => ({ fileName: "-", status: "failed", error: message }));
    const usedRows = new Set();

    for (const file of bulk.files) {
      const row = rowsByFile.get(normaliseFileName(file.fileName));
      if (row) usedRows.add(row);
      try {
        const track = await createTrackFromRow(bulk, file, row, { validGenres, validVibes });
        results.push({
          fileName: file.fileName,
          row: row?.row ?? null,
          status: "created",
          trackId: track._id,
          title: track.title,
        });
      } catch (error) {
        results.push({
          fileName: file.fileName,
          row: row?.row ?? null,
          status: "failed",
          error: error.message,
        });
      }
    }

    // CSV rows that point at a file nobody uploaded
    rows
      .filter((row) => !usedRows.has(row))
      .forEach((row) =>
        results.push({
          fileName: row.fileName,
          row: row.row,
          status: "failed",
          error: "No uploaded file with this name",
        })
      );

    bulk.results = results;
    bulk.status = "done";
    bulk.finishedAt = new Date();
    await bulk.save();
    const created = results.filter((result) => result.status === "created").length;
    logger.info(`[BulkImport] ${bulk._id}: ${created} created, ${results.length - created} failed`);
  } catch (error) {
    bulk.status = "failed";
    bulk.error = "The bulk upload stopped unexpectedly. Try again.";
    bulk.finishedAt = new Date();
    await bulk.save();
    logger.error({ err: error }, `[BulkImport] ${bulk._id} failed`);
  }
}

/**
 * Create one track from an uploaded file and its (optional) CSV row.
 * @throws {Error} With a message shown in the failed-rows list
 */
async function createTrackFromRow(bulk, file, row, { validGenres, validVibes }) {
  const { defaults } = bulk;

  // Artist: CSV name (found or created as an official artist), else the default
  let artistId = defaults.artistId;
  if (row?.artist) {
    const artist =
      (await findArtistByName(row.artist)) ??
      (await createOfficialArtist({ stageName: row.artist }, bulk.createdBy));
    artistId = artist._id;
  }
  if (!artistId) throw new Error("No artist — add an artist column or choose a default artist");

  const unknownGenres = (row?.genres ?? []).filter((slug) => !validGenres.has(slug));
  const unknownVibes = (row?.vibes ?? []).filter((slug) => !validVibes.has(slug));
  if (unknownGenres.length) throw new Error(`Unknown genre: ${unknownGenres.join(", ")}`);
  if (unknownVibes.length) throw new Error(`Unknown vibe: ${unknownVibes.join(", ")}`);

  // Album: found or created for this artist
  let albumId = null;
  if (row?.album) {
    const album =
      (await Album.findOne({
        artistId,
        title: { $regex: `^${row.album.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      })) ?? (await Album.create({ artistId, title: row.album, createdByStaff: bulk.createdBy }));
    albumId = album._id;
  }

  return createTrack({
    artistId,
    uploadedBy: bulk.createdBy,
    audioKey: file.audioKey,
    metadata: {
      title: row?.title || titleFromFileName(file.fileName),
      genres: row?.genres?.length ? row.genres : defaults.genres,
      vibes: row?.vibes?.length ? row.vibes : defaults.vibes,
      mood: MOODS.includes(row?.mood) ? row.mood : null,
      language: LANGUAGES.includes(row?.language) ? row.language : null,
      explicit: Boolean(row?.explicit),
      albumId,
    },
    addedVia: "admin",
    releaseIntent: defaults.releaseIntent,
    scheduledAt: defaults.scheduledAt,
    rightsConfirmed: true,
  });
}

/**
 * Bulk import status for the console (polled while it runs).
 * @param {string} bulkImportId
 * @returns {Promise<Object>}
 */
export async function getBulkImport(bulkImportId) {
  const bulk = await BulkImport.findById(bulkImportId).select("-csvText");
  if (!bulk) throw ApiError.notFound("Bulk upload not found");
  return bulk;
}
