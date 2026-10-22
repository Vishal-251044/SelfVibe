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

const QUIZ_ARTIST_LIMIT = 24;
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
 * Everything the quiz can offer: active genres and vibes, plus popular artists.
 * @returns {Promise<{ genres: Object[], vibes: Object[], artists: Object[] }>}
 */
export async function getOnboardingOptions() {
  const [genres, vibes, artists] = await Promise.all([
    Genre.find({ active: true }).sort({ order: 1 }).select(TAXONOMY_FIELDS).lean(),
    Vibe.find({ active: true }).sort({ order: 1 }).select(TAXONOMY_FIELDS).lean(),
    ArtistProfile.find()
      .sort({ followersCount: -1, createdAt: -1 })
      .limit(QUIZ_ARTIST_LIMIT)
      .select("stageName avatar verified")
      .lean(),
  ]);

  const stripId = ({ _id, ...rest }) => rest; // slugs are the public ids for taxonomy
  return {
    genres: genres.map(stripId),
    vibes: vibes.map(stripId),
    artists: artists.map((artist) => ({
      id: String(artist._id),
      stageName: artist.stageName,
      avatar: artist.avatar ?? null,
      verified: artist.verified,
    })),
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

  logger.info(
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
  logger.info(`[OnboardingService] onboarding skipped userId=${userId}`);
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
