/**
 * Feed builder rules (PRD 10.4.4, CAT-4, roadmap Day 8):
 * - at most 2 songs by the same artist in a section, never two in a row
 * - about 70% familiar / 30% discovery, interleaved (F F D F F D …)
 * - with the catalog switch on All, about 20% Community songs
 * Pure functions only (unit tested).
 */
import { FEED_RULES } from "../../config/constants.js";

/**
 * @typedef {{ track: { id: string, artistId: string, catalog: string }, score: number, familiar: boolean }} RankedItem
 */

/**
 * Pick a diverse section from ranked candidates.
 * @param {RankedItem[]} ranked - Best first
 * @param {Object} options
 * @param {number} options.size
 * @param {number} [options.maxPerArtist]
 * @param {number|null} [options.familiarShare] - null = ignore familiar / discovery
 * @param {number|null} [options.communityShare] - e.g. 0.2 with All; null = no catalog quota
 * @returns {RankedItem[]} In display order
 */
export function pickDiverse(ranked, options) {
  const {
    size,
    maxPerArtist = FEED_RULES.maxPerArtist,
    familiarShare = FEED_RULES.familiarShare,
    communityShare = null,
  } = options;
  const perArtist = new Map();
  const chosen = new Set();
  const picked = [];
  const familiarTarget = familiarShare === null ? null : Math.round(size * familiarShare);
  const communityTarget = communityShare === null ? null : Math.round(size * communityShare);
  const counts = { familiar: 0, discovery: 0, community: 0, official: 0 };

  const canTake = (item) =>
    !chosen.has(item.track.id) && (perArtist.get(item.track.artistId) ?? 0) < maxPerArtist;
  const take = (item) => {
    chosen.add(item.track.id);
    perArtist.set(item.track.artistId, (perArtist.get(item.track.artistId) ?? 0) + 1);
    counts[item.familiar ? "familiar" : "discovery"] += 1;
    counts[item.track.catalog === "community" ? "community" : "official"] += 1;
    picked.push(item);
  };

  // Pass 1: respect every quota; pass 2: fill gaps when a pool runs short
  const withinQuotas = (item) => {
    if (familiarTarget !== null) {
      const limit = item.familiar ? familiarTarget : size - familiarTarget;
      if (counts[item.familiar ? "familiar" : "discovery"] >= limit) return false;
    }
    if (communityTarget !== null) {
      const isCommunity = item.track.catalog === "community";
      const limit = isCommunity ? communityTarget : size - communityTarget;
      if (counts[isCommunity ? "community" : "official"] >= limit) return false;
    }
    return true;
  };
  for (const item of ranked) {
    if (picked.length >= size) break;
    if (canTake(item) && withinQuotas(item)) take(item);
  }
  for (const item of ranked) {
    if (picked.length >= size) break;
    if (canTake(item)) take(item);
  }

  return spreadArtists(interleave(picked, familiarShare));
}

/**
 * Mix discovery picks between familiar ones (e.g. F F D F F D), each list best first.
 * @param {RankedItem[]} items
 * @param {number|null} familiarShare
 * @returns {RankedItem[]}
 */
export function interleave(items, familiarShare) {
  if (familiarShare === null) return [...items];
  const familiar = items.filter((item) => item.familiar);
  const discovery = items.filter((item) => !item.familiar);
  const result = [];
  let familiarSeen = 0;
  const runLength = Math.max(1, Math.round(familiarShare / (1 - familiarShare))); // 0.7 → 2
  while (familiar.length || discovery.length) {
    const takeDiscovery = discovery.length && (familiarSeen >= runLength || familiar.length === 0);
    if (takeDiscovery) {
      result.push(discovery.shift());
      familiarSeen = 0;
    } else {
      result.push(familiar.shift());
      familiarSeen += 1;
    }
  }
  return result;
}

/**
 * Move songs so the same artist never plays twice in a row (when possible).
 * @param {RankedItem[]} items
 * @returns {RankedItem[]}
 */
export function spreadArtists(items) {
  const result = [...items];
  const artistAt = (list, position) => list[position]?.track.artistId;
  // No same-artist neighbour on either side of a position
  const fits = (list, position) =>
    artistAt(list, position) !== artistAt(list, position - 1) &&
    artistAt(list, position) !== artistAt(list, position + 1);

  for (let i = 1; i < result.length; i += 1) {
    if (artistAt(result, i) !== artistAt(result, i - 1)) continue;
    // Swap with a later song if both places end up without a same-artist neighbour
    for (let j = i + 1; j < result.length; j += 1) {
      const trial = [...result];
      [trial[i], trial[j]] = [trial[j], trial[i]];
      if (fits(trial, i) && fits(trial, j)) {
        [result[i], result[j]] = [result[j], result[i]];
        break;
      }
    }
  }
  return result;
}

/**
 * The "Right now" vibe for a local hour: the candidate vibe the user likes most.
 * @param {number} hour - 0–23
 * @param {Object<string, number>} vibeAffinity - Normalised vibe weights
 * @param {Array<{ from: number, to: number, vibes: string[] }>} dayParts
 * @param {Set<string>} [available] - Vibes that exist (active)
 * @returns {{ dayPart: number, vibe: string|null, options: string[] }} options = every fitting vibe, best first
 */
export function pickRightNowVibe(hour, vibeAffinity, dayParts, available = null) {
  const dayPart = Math.max(
    0,
    dayParts.findIndex((part) => hour >= part.from && hour < part.to)
  );
  const options = dayParts[dayPart].vibes.filter((vibe) => !available || available.has(vibe));
  // Most-liked first; ties keep the time-of-day order (first = most fitting). Stable sort.
  const ordered = [...options].sort((a, b) => (vibeAffinity[b] ?? 0) - (vibeAffinity[a] ?? 0));
  return { dayPart, vibe: ordered[0] ?? null, options: ordered };
}
