/**
 * One-time search setup (roadmap Day 7 "Atlas Search index on title, artist
 * name and tags"). Safe to run again. Steps:
 * 1. Copy each artist's name onto their songs (`artistName`), so a search for
 *    "tum hi ho arijit" matches title + artist together.
 * 2. Sync Track indexes: replaces the old `title_search` text index with the
 *    title + artist one (MongoDB allows only one text index per collection).
 * 3. Create / update Atlas Search indexes (fuzzy, typo-tolerant search) on
 *    tracks, artist profiles and playlists. Needs MongoDB Atlas; on a local
 *    MongoDB this step is skipped and the app uses its built-in fuzzy index.
 * Usage: npm run search:setup
 */
import mongoose from "mongoose";
import { env, isUnset } from "../src/config/env.js";
import { Track } from "../src/models/track.model.js";
import { ArtistProfile } from "../src/models/artistProfile.model.js";
import { Playlist } from "../src/models/playlist.model.js";
import { logger } from "../src/utils/logger.js";

const text = { type: "string", analyzer: "lucene.standard" };

/** Atlas Search indexes the app queries (names must match search.service.js). */
const SEARCH_INDEXES = [
  {
    model: Track,
    name: "tracks_search",
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          title: text,
          artistName: text,
          genres: text,
          vibes: text,
          status: { type: "token" },
          catalog: { type: "token" },
        },
      },
    },
  },
  {
    model: ArtistProfile,
    name: "artists_search",
    definition: { mappings: { dynamic: false, fields: { stageName: text } } },
  },
  {
    model: Playlist,
    name: "playlists_search",
    definition: { mappings: { dynamic: false, fields: { name: text } } },
  },
];

/**
 * Fill in `artistName` on songs that don't have it (or have an old name).
 * @returns {Promise<number>} Songs updated
 */
async function backfillArtistNames() {
  const artists = await ArtistProfile.find().select("stageName").lean();
  if (artists.length === 0) return 0;
  const result = await Track.bulkWrite(
    artists.map((artist) => ({
      updateMany: {
        filter: { artistId: artist._id, artistName: { $ne: artist.stageName } },
        update: { $set: { artistName: artist.stageName } },
      },
    }))
  );
  return result.modifiedCount;
}

/**
 * Create or update the Atlas Search indexes.
 * @returns {Promise<void>}
 */
async function ensureSearchIndexes() {
  for (const { model, name, definition } of SEARCH_INDEXES) {
    let existing;
    try {
      existing = await model.listSearchIndexes({ name });
    } catch (error) {
      logger.warn(
        `[SetupSearch] Atlas Search isn't available on this database (${error.message}). ` +
          "Search still works with the built-in fuzzy index."
      );
      return;
    }
    if (existing.length === 0) {
      await model.createSearchIndex({ name, definition });
      logger.info(
        `[SetupSearch] ${model.modelName}: created search index ${name} (ready in about a minute)`
      );
    } else {
      await model.updateSearchIndex(name, definition);
      logger.info(
        `[SetupSearch] ${model.modelName}: search index ${name} up to date (${existing[0].status})`
      );
    }
  }
}

/** @returns {Promise<void>} */
async function run() {
  if (isUnset(env.databaseUrl)) throw new Error("DATABASE_URL is not set in backend/.env");
  await mongoose.connect(env.databaseUrl, { serverSelectionTimeoutMS: 15000 });

  const updated = await backfillArtistNames();
  logger.info(`[SetupSearch] artist names copied onto ${updated} song(s)`);

  const dropped = await Track.syncIndexes();
  logger.info(
    `[SetupSearch] Track indexes in sync${dropped.length ? ` (dropped ${dropped.join(", ")})` : ""}`
  );

  await ensureSearchIndexes();
}

run()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    logger.error(`[SetupSearch] ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
