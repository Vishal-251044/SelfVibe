/**
 * Creator endpoints: /api/creator/* ("Become a Creator", own artist profile)
 * and the public artist page /api/artists/:idOrSlug.
 */
import * as creatorService from "../services/creator.service.js";
import { getPublicArtistPage } from "../services/artist.service.js";
import { assertUploaded, processCoverUpload } from "../services/mediaUpload.service.js";
import { assertTagsExist } from "../services/track.service.js";
import { toAlbum, toPublicArtist, toPublicTrack } from "../services/track.serializer.js";
import { toPublicUser } from "../services/user.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** POST /api/creator/become — adds the creator role + artist profile (CRT-1) */
export const becomeCreator = asyncHandler(async (req, res) => {
  await assertTagsExist({ genres: req.body.genres });
  const { user, artist } = await creatorService.becomeCreator(req.auth.userId, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    // The client refreshes its session so the new role is in the access token
    message: "You're a creator now",
    data: { user: toPublicUser(user), artist: toPublicArtist(artist) },
  });
});

/** GET /api/creator/me — own artist profile (null before becoming a creator) */
export const getMyArtist = asyncHandler(async (req, res) => {
  const artist = await creatorService.getMyArtistProfile(req.auth.userId);
  return sendSuccess(res, {
    message: "Artist profile fetched",
    data: {
      artist: artist
        ? {
            ...toPublicArtist(artist),
            // Own profile only: where the verified-badge request stands (Day 9)
            verificationStatus: artist.verification?.status ?? "none",
          }
        : null,
    },
  });
});

/** PATCH /api/creator/me — edit own artist profile */
export const updateMyArtist = asyncHandler(async (req, res) => {
  const { avatarKey, ...changes } = req.body;
  if (changes.genres) await assertTagsExist({ genres: changes.genres });

  const current = await creatorService.requireMyArtistProfile(req.auth.userId);
  if (avatarKey) {
    await assertUploaded(avatarKey, { userId: req.auth.userId }, "image", "avatarKey");
    changes.avatar = (await processCoverUpload(avatarKey, "artists", String(current._id))).url;
  }
  const artist = await creatorService.updateMyArtistProfile(req.auth.userId, changes);
  return sendSuccess(res, {
    message: "Artist profile updated",
    data: { artist: toPublicArtist(artist) },
  });
});

/** GET /api/artists/:idOrSlug — public artist page with tracks and albums */
export const getArtistPage = asyncHandler(async (req, res) => {
  const { artist, tracks, albums } = await getPublicArtistPage(req.params.idOrSlug);
  return sendSuccess(res, {
    message: "Artist fetched",
    data: {
      artist: toPublicArtist(artist),
      tracks: tracks.map(toPublicTrack),
      albums: albums.map(toAlbum),
      // Hides the Follow button on your own artist page
      isOwnPage: Boolean(req.auth && artist.userId && String(artist.userId) === req.auth.userId),
    },
  });
});
