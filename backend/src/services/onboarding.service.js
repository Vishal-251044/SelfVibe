/**
 * Taste onboarding (PRD ONB-1, ONB-2, §10.4): the quiz options, saving the
 * answers as the user's initial taste profile, skipping, and reading the
 * taste profile back for the profile page.
 */
import { User } from "../models/user.model.js";
import { Genre } from "../models/genre.model.js";
import { Vibe } from "../models/vibe.model.js";
import { ArtistProfile } from "../models/artistProfile.model.js";
import { TasteProfile } from "../models/tasteProfile.model.js";
import { ERROR_CODES, QUIZ_TASTE_WEIGHTS } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

const QUIZ_ARTISTS_PER_GROUP = 12;
const ARTIST_CANDIDATE_LIMIT = 300;
const ARTIST_FIELDS = "stageName avatar avatarCredit verified country genres vibes popularity";
/** Points per matching tag when ranking artists for the quiz. */
const ARTIST_MATCH_WEIGHTS = Object.freeze({ genre: 3, vibe: 2 });
const TAXONOMY_FIELDS = "slug name icon colour description";

/**
 * Turn quiz answers into starting taste weights (pure — unit tested).
 * Each pick gets the cold-start weight for its kind (PRD §10.4.1).
 * @param {{ genres: string[], vibes: string[], artists?: string[] }} answers
 * @returns {{ genreWeights: Object<string, number>, vibeWeights: Object<string, number>, artistWeights: Object<string, number> }}
 */
export function buildQuizTasteWeights({ genres, vibes, artists = [] }) {
  const toWeights = (keys, weight) =>
    Object.fromEntries([...new Set(keys)].map((key) => [String(key), weight]));

  return {
    genreWeights: toWeights(genres, QUIZ_TASTE_WEIGHTS.genre),
    vibeWeights: toWeights(vibes, QUIZ_TASTE_WEIGHTS.vibe),
    artistWeights: toWeights(artists, QUIZ_TASTE_WEIGHTS.artist),
  };
}

/**
 * The genres and vibes the quiz can offer (artists come from getArtistSuggestions,
 * because they depend on what the user picked).
 * @returns {Promise<{ genres: Object[], vibes: Object[] }>}
 */
export async function getOnboardingOptions() {
  const [genres, vibes] = await Promise.all([
    Genre.find({ active: true }).sort({ order: 1 }).select(TAXONOMY_FIELDS).lean(),
    Vibe.find({ active: true }).sort({ order: 1 }).select(TAXONOMY_FIELDS).lean(),
  ]);

  const stripId = ({ _id, ...rest }) => rest; // slugs are the public ids for taxonomy
  return { genres: genres.map(stripId), vibes: vibes.map(stripId) };
}

/**
 * How well an artist matches the quiz picks (pure — unit tested).
 * Genre matches count most, then vibes; popularity only breaks ties.
 * @param {{ genres?: string[], vibes?: string[], popularity?: number }} artist
 * @param {{ genres: string[], vibes: string[] }} picks
 * @returns {number} 0 when nothing matches (before the popularity tie-breaker)
 */
export function scoreArtistForTaste(artist, picks) {
  const overlap = (tags = [], wanted = []) => tags.filter((tag) => wanted.includes(tag)).length;
  const genreHits = overlap(artist.genres, picks.genres);
  const vibeHits = overlap(artist.vibes, picks.vibes);
  const relevance = genreHits * ARTIST_MATCH_WEIGHTS.genre + vibeHits * ARTIST_MATCH_WEIGHTS.vibe;
  return relevance + (artist.popularity ?? 0) / 100; // popularity adds < 1 point
}

/**
 * Rank artists for the quiz: best matches first, topped up with popular
 * artists, split into India (shown first) and the rest of the world.
 * @param {{ genres: string[], vibes: string[] }} picks - Genre / vibe slugs chosen so far
 * @returns {Promise<{ india: Object[], world: Object[] }>}
 */
export async function getArtistSuggestions(picks) {
  const hasPicks = picks.genres.length > 0 || picks.vibes.length > 0;
  const matchFilter = hasPicks
    ? { $or: [{ genres: { $in: picks.genres } }, { vibes: { $in: picks.vibes } }] }
    : {};

  // Matching artists, plus the most popular ones so short lists are topped up
  const [matches, popular] = await Promise.all([
    ArtistProfile.find(matchFilter).limit(ARTIST_CANDIDATE_LIMIT).select(ARTIST_FIELDS).lean(),
    ArtistProfile.find()
      .sort({ popularity: -1, followersCount: -1 })
      .limit(QUIZ_ARTISTS_PER_GROUP * 2)
      .select(ARTIST_FIELDS)
      .lean(),
  ]);

  const unique = new Map([...matches, ...popular].map((artist) => [String(artist._id), artist]));
  const ranked = [...unique.values()]
    .map((artist) => ({ artist, score: scoreArtistForTaste(artist, picks) }))
    .sort((a, b) => b.score - a.score)
    .map(({ artist }) => ({
      id: String(artist._id),
      stageName: artist.stageName,
      avatar: artist.avatar ?? null,
      avatarCreditUrl: artist.avatarCredit?.url ?? null,
      verified: artist.verified,
      country: artist.country,
      genres: artist.genres ?? [],
    }));

  return {
    india: ranked.filter((artist) => artist.country === "IN").slice(0, QUIZ_ARTISTS_PER_GROUP),
    world: ranked.filter((artist) => artist.country !== "IN").slice(0, QUIZ_ARTISTS_PER_GROUP),
  };
}

/**
 * Throw 400 unless every picked slug / id exists (and is active).
 * @param {{ genres: string[], vibes: string[], artists: string[] }} answers
 * @throws {ApiError} 400 UNKNOWN_TASTE_OPTION
 */
async function assertAnswersExist({ genres, vibes, artists }) {
  const [genreCount, vibeCount, artistCount] = await Promise.all([
    Genre.countDocuments({ slug: { $in: genres }, active: true }),
    Vibe.countDocuments({ slug: { $in: vibes }, active: true }),
    artists.length ? ArtistProfile.countDocuments({ _id: { $in: artists } }) : 0,
  ]);

  const fields = {};
  if (genreCount !== genres.length) fields.genres = "One or more genres are no longer available";
  if (vibeCount !== vibes.length) fields.vibes = "One or more vibes are no longer available";
  if (artistCount !== artists.length)
    fields.artists = "One or more artists are no longer available";

  if (Object.keys(fields).length > 0) {
    throw ApiError.badRequest("Some of your picks are no longer available. Please choose again.", {
      code: ERROR_CODES.UNKNOWN_TASTE_OPTION,
      fields,
    });
  }
}

/**
 * Save quiz answers as the user's taste profile and finish onboarding.
 * Retaking the quiz replaces the previous quiz picks.
 * @param {string} userId
 * @param {{ genres: string[], vibes: string[], artists?: string[] }} answers - Validated, de-duplicated
 * @returns {Promise<Object>} The updated user document
 */
export async function completeOnboarding(userId, answers) {
  const normalised = {
    genres: [...new Set(answers.genres)],
    vibes: [...new Set(answers.vibes)],
    artists: [...new Set(answers.artists ?? [])],
  };
  await assertAnswersExist(normalised);

  const weights = buildQuizTasteWeights(normalised);
  await TasteProfile.findOneAndUpdate(
    { userId },
    { $set: { userId, ...weights } },
    { upsert: true, setDefaultsOnInsert: true }
  );

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { onboardingDone: true } },
    { returnDocument: "after" }
  );
  if (!user) throw ApiError.notFound(`User not found with id: ${userId}`);

  logger.debug(
    `[OnboardingService] taste profile saved userId=${userId} genres=${normalised.genres.length} vibes=${normalised.vibes.length} artists=${normalised.artists.length}`
  );
  return user;
}

/**
 * Skip the quiz (ONB-2): no taste profile; feeds fall back to trending.
 * @param {string} userId
 * @returns {Promise<Object>} The updated user document
 */
export async function skipOnboarding(userId) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { onboardingDone: true } },
    { returnDocument: "after" }
  );
  if (!user) throw ApiError.notFound(`User not found with id: ${userId}`);
  logger.debug(`[OnboardingService] onboarding skipped userId=${userId}`);
  return user;
}

/**
 * Read the taste profile with display names, strongest first.
 * @param {string} userId
 * @returns {Promise<{ genres: Object[], vibes: Object[], artists: Object[], updatedAt: Date } | null>}
 *   null when the user has no taste profile yet
 */
export async function getTasteSummary(userId) {
  const profile = await TasteProfile.findOne({ userId }).lean();
  if (!profile) return null;

  const byWeight = (weights = {}) =>
    Object.entries(weights)
      .filter(([, weight]) => weight > 0)
      .sort(([, a], [, b]) => b - a);

  const genreEntries = byWeight(profile.genreWeights);
  const vibeEntries = byWeight(profile.vibeWeights);
  const artistEntries = byWeight(profile.artistWeights);

  const [genres, vibes, artists] = await Promise.all([
    Genre.find({ slug: { $in: genreEntries.map(([slug]) => slug) } })
      .select(TAXONOMY_FIELDS)
      .lean(),
    Vibe.find({ slug: { $in: vibeEntries.map(([slug]) => slug) } })
      .select(TAXONOMY_FIELDS)
      .lean(),
    ArtistProfile.find({ _id: { $in: artistEntries.map(([id]) => id) } })
      .select("stageName avatar")
      .lean(),
  ]);

  /** Attach display data to [key, weight] pairs, keeping the weight order. */
  const merge = (entries, docs, keyOf, toItem) => {
    const lookup = new Map(docs.map((doc) => [keyOf(doc), doc]));
    return entries
      .filter(([key]) => lookup.has(key))
      .map(([key, weight]) => toItem(lookup.get(key), weight));
  };
  const taxonomyItem = (doc, weight) => ({
    slug: doc.slug,
    name: doc.name,
    icon: doc.icon,
    colour: doc.colour,
    weight,
  });

  return {
    genres: merge(genreEntries, genres, (doc) => doc.slug, taxonomyItem),
    vibes: merge(vibeEntries, vibes, (doc) => doc.slug, taxonomyItem),
    artists: merge(
      artistEntries,
      artists,
      (doc) => String(doc._id),
      (doc, weight) => ({
        id: String(doc._id),
        stageName: doc.stageName,
        avatar: doc.avatar ?? null,
        weight,
      })
    ),
    updatedAt: profile.updatedAt,
  };
}
