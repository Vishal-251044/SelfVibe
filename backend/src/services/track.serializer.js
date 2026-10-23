/**
 * Public shapes of tracks, artists and albums sent to clients.
 * Storage keys never leave the API — clients get URLs only.
 */

/**
 * Small artist reference embedded in track responses.
 * @param {Object|null} artist - Populated ArtistProfile (or null)
 * @returns {Object|null}
 */
export function toArtistRef(artist) {
  if (!artist || !artist._id) return null;
  return {
    id: String(artist._id),
    stageName: artist.stageName,
    slug: artist.slug ?? null,
    avatar: artist.avatar ?? null,
    verified: Boolean(artist.verified),
  };
}

/**
 * Track as listeners see it.
 * @param {Object} track - Track document (artistId populated when available)
 * @returns {Object}
 */
export function toPublicTrack(track) {
  const artist = track.artistId?._id ? track.artistId : null;
  return {
    id: String(track._id),
    title: track.title,
    artist: toArtistRef(artist),
    artistId: String(artist?._id ?? track.artistId),
    albumId: track.albumId ? String(track.albumId._id ?? track.albumId) : null,
    coverUrl: track.coverUrl ?? null,
    durationSec: track.audio?.durationSec ?? 0,
    waveform: track.audio?.waveform ?? [],
    genres: track.genres ?? [],
    vibes: track.vibes ?? [],
    mood: track.mood ?? null,
    language: track.language ?? null,
    explicit: Boolean(track.explicit),
    lyrics: track.lyrics ?? "",
    source: track.source,
    license: track.license?.name ? track.license : null,
    playCount: track.playCount ?? 0,
    likeCount: track.likeCount ?? 0,
    publishedAt: track.publishedAt ?? null,
  };
}

/**
 * Track as its owner (creator) or staff see it: adds status and processing info.
 * @param {Object} track
 * @returns {Object}
 */
export function toManagedTrack(track) {
  return {
    ...toPublicTrack(track),
    status: track.status,
    releaseIntent: track.releaseIntent,
    scheduledAt: track.scheduledAt ?? null,
    addedVia: track.addedVia,
    featured: Boolean(track.featured),
    rightsConfirmed: Boolean(track.rightsConfirmed),
    bitrates: (track.audio?.formats ?? []).map((format) => format.bitrateKbps),
    processing: {
      state: track.processing?.state ?? "queued",
      error: track.processing?.error ?? null,
      attempts: track.processing?.attempts ?? 0,
    },
    external: track.external?.provider ? track.external : null,
    createdAt: track.createdAt,
    updatedAt: track.updatedAt,
  };
}

/**
 * Artist profile as listeners see it.
 * @param {Object} artist
 * @returns {Object}
 */
export function toPublicArtist(artist) {
  return {
    ...toArtistRef(artist),
    bio: artist.bio ?? "",
    banner: artist.banner ?? null,
    avatarCreditUrl: artist.avatarCredit?.url ?? null,
    country: artist.country ?? null,
    genres: artist.genres ?? [],
    vibes: artist.vibes ?? [],
    socials: artist.socials ?? {},
    followersCount: artist.followersCount ?? 0,
    isOfficial: !artist.userId, // created by staff, not a creator account
  };
}

/**
 * Artist as staff see it in the console.
 * @param {Object} artist
 * @param {number} [trackCount]
 * @returns {Object}
 */
export function toManagedArtist(artist, trackCount) {
  return {
    ...toPublicArtist(artist),
    userId: artist.userId ? String(artist.userId) : null,
    popularity: artist.popularity ?? 0,
    trackCount: trackCount ?? null,
    createdAt: artist.createdAt,
  };
}

/**
 * @param {Object} album
 * @returns {Object}
 */
export function toAlbum(album) {
  return {
    id: String(album._id),
    artistId: String(album.artistId?._id ?? album.artistId),
    title: album.title,
    type: album.type,
    coverUrl: album.coverUrl ?? null,
    releaseDate: album.releaseDate ?? null,
    trackIds: (album.trackIds ?? []).map((id) => String(id._id ?? id)),
    trackCount: album.trackIds?.length ?? 0,
  };
}
