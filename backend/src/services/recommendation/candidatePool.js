/**
 * Every published song that can be recommended, with only the fields the
 * engine needs (genres, vibes, artist, catalog, popularity, age). Shared by
 * the For You feed, Similar tracks and Daily Mix; cached for 2 minutes per
 * catalog, so a 5,000-song catalog is read at most once per window.
 */
import { Track } from "../../models/track.model.js";
import { publishedFilter } from "../browse.service.js";

const POOL_FIELDS = "artistId genres vibes mood energy catalog playCount publishedAt";
const POOL_CACHE_MS = 2 * 60 * 1000;
const poolCache = new Map(); // catalog → { at, tracks }
const poolLoads = new Map(); // catalog → Promise, so many feeds at once share one read

/**
 * @param {"all"|"official"|"community"} catalog
 * @returns {Promise<Array<{ id: string, artistId: string, genres: string[], vibes: string[], mood: string|null, energy: number|null, catalog: string, playCount: number, publishedAt: Date }>>}
 */
export async function getCandidatePool(catalog) {
  const cached = poolCache.get(catalog);
  if (cached && Date.now() - cached.at < POOL_CACHE_MS) return cached.tracks;
  if (!poolLoads.has(catalog)) {
    poolLoads.set(
      catalog,
      loadPool(catalog).finally(() => poolLoads.delete(catalog))
    );
  }
  return poolLoads.get(catalog);
}

/**
 * Read the pool from the database and cache it.
 * @param {"all"|"official"|"community"} catalog
 * @returns {Promise<Array<Object>>}
 */
async function loadPool(catalog) {
  const docs = await Track.find(publishedFilter(catalog)).select(POOL_FIELDS).lean();
  const tracks = docs.map((doc) => ({
    id: String(doc._id),
    artistId: String(doc.artistId),
    genres: doc.genres ?? [],
    vibes: doc.vibes ?? [],
    mood: doc.mood ?? null,
    energy: doc.energy ?? null,
    catalog: doc.catalog ?? "community",
    playCount: doc.playCount ?? 0,
    publishedAt: doc.publishedAt,
  }));
  poolCache.set(catalog, { at: Date.now(), tracks });
  return tracks;
}

/** Forget cached pools (tests, big catalog changes). */
export function resetCandidatePools() {
  poolCache.clear();
  poolLoads.clear();
}
